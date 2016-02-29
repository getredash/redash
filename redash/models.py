import json
from flask_login import UserMixin, AnonymousUserMixin
import hashlib
import logging
import os
import threading
import time
import datetime
import itertools
from funcy import project

import peewee
from passlib.apps import custom_app_context as pwd_context
from playhouse.postgres_ext import ArrayField, DateTimeTZField
from permissions import has_access, view_only

from redash import utils, settings, redis_connection
from redash.query_runner import get_query_runner, get_configuration_schema_for_type
from redash.metrics.database import MeteredPostgresqlExtDatabase, MeteredModel
from redash.utils import generate_token
from redash.utils.configuration import ConfigurationContainer



class Database(object):
    def __init__(self):
        self.database_config = dict(settings.DATABASE_CONFIG)
        self.database_config['register_hstore'] = False
        self.database_name = self.database_config.pop('name')
        self.database = MeteredPostgresqlExtDatabase(self.database_name, **self.database_config)
        self.app = None
        self.pid = os.getpid()

    def init_app(self, app):
        self.app = app
        self.register_handlers()

    def connect_db(self):
        self._check_pid()
        self.database.reset_metrics()
        self.database.connect()

    def close_db(self, exc):
        self._check_pid()
        if not self.database.is_closed():
            self.database.close()

    def _check_pid(self):
        current_pid = os.getpid()
        if self.pid != current_pid:
            logging.info("New pid detected (%d!=%d); resetting database lock.", self.pid, current_pid)
            self.pid = os.getpid()
            self.database._conn_lock = threading.Lock()

    def register_handlers(self):
        self.app.before_request(self.connect_db)
        self.app.teardown_request(self.close_db)


db = Database()


# Support for cast operation on database fields
@peewee.Node.extend()
def cast(self, as_type):
    return peewee.Expression(self, '::', peewee.SQL(as_type))


class JSONField(peewee.TextField):
    def db_value(self, value):
        return json.dumps(value)

    def python_value(self, value):
        return json.loads(value)


class BaseModel(MeteredModel):
    class Meta:
        database = db.database

    @classmethod
    def get_by_id(cls, model_id):
        return cls.get(cls.id == model_id)

    def pre_save(self, created):
        pass

    def post_save(self, created):
        # Handler for post_save operations. Overriding if needed.
        pass

    def save(self, *args, **kwargs):
        pk_value = self._get_pk_value()
        created = kwargs.get('force_insert', False) or not bool(pk_value)
        self.pre_save(created)
        super(BaseModel, self).save(*args, **kwargs)
        self.post_save(created)

    def update_instance(self, **kwargs):
        for k, v in kwargs.items():
            # setattr(model_instance, field_name, field_obj.python_value(value))
            setattr(self, k, v)

        # We have to run pre-save before calculating dirty_fields. We end up running it twice,
        # but pre_save calls should be very quick so it's not big of an issue.
        # An alternative can be to recalculate dirty_fields, but it felt more error prone.
        self.pre_save(False)

        self.save(only=self.dirty_fields)


class ModelTimestampsMixin(BaseModel):
    updated_at = DateTimeTZField(default=datetime.datetime.now)
    created_at = DateTimeTZField(default=datetime.datetime.now)

    def pre_save(self, created):
        super(ModelTimestampsMixin, self).pre_save(created)

        self.updated_at = datetime.datetime.now()


class BelongsToOrgMixin(object):
    @classmethod
    def get_by_id_and_org(cls, object_id, org):
        return cls.get(cls.id == object_id, cls.org == org)


class PermissionsCheckMixin(object):
    def has_permission(self, permission):
        return self.has_permissions((permission,))

    def has_permissions(self, permissions):
        has_permissions = reduce(lambda a, b: a and b,
                                 map(lambda permission: permission in self.permissions,
                                     permissions),
                                 True)

        return has_permissions


class AnonymousUser(AnonymousUserMixin, PermissionsCheckMixin):
    @property
    def permissions(self):
        return []


class ApiUser(UserMixin, PermissionsCheckMixin):
    def __init__(self, api_key, org, groups):
        self.id = api_key
        self.groups = groups
        self.org = org

    def __repr__(self):
        return u"<ApiUser: {}>".format(self.id)

    @property
    def permissions(self):
        return ['view_query']


class Organization(ModelTimestampsMixin, BaseModel):
    SETTING_GOOGLE_APPS_DOMAINS = 'google_apps_domains'
    SETTING_IS_PUBLIC = "is_public"

    id = peewee.PrimaryKeyField()
    name = peewee.CharField()
    slug = peewee.CharField(unique=True)
    settings = JSONField()

    class Meta:
        db_table = 'organizations'

    def __repr__(self):
        return u"<Organization: {}, {}>".format(self.id, self.name)

    # When Organization is used with LocalProxy (like the current_org helper), peewee doesn't recognize it as a Model
    # and might call int() on it. This method makes sure it works.
    def __int__(self):
        return self.id

    @classmethod
    def get_by_slug(cls, slug):
        return cls.get(cls.slug == slug)

    @property
    def default_group(self):
        return self.groups.where(Group.name=='default', Group.type==Group.BUILTIN_GROUP).first()

    @property
    def google_apps_domains(self):
        return self.settings.get(self.SETTING_GOOGLE_APPS_DOMAINS, [])

    @property
    def is_public(self):
        return self.settings.get(self.SETTING_IS_PUBLIC, False)

    @property
    def admin_group(self):
        return self.groups.where(Group.name=='admin', Group.type==Group.BUILTIN_GROUP).first()


class Group(BaseModel, BelongsToOrgMixin):
    DEFAULT_PERMISSIONS = ['create_dashboard', 'create_query', 'edit_dashboard', 'edit_query',
                           'view_query', 'view_source', 'execute_query', 'list_users', 'schedule_query']

    BUILTIN_GROUP = 'builtin'
    REGULAR_GROUP = 'regular'

    id = peewee.PrimaryKeyField()
    org = peewee.ForeignKeyField(Organization, related_name="groups")
    type = peewee.CharField(default=REGULAR_GROUP)
    name = peewee.CharField(max_length=100)
    permissions = ArrayField(peewee.CharField, default=DEFAULT_PERMISSIONS)
    created_at = DateTimeTZField(default=datetime.datetime.now)

    class Meta:
        db_table = 'groups'

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'permissions': self.permissions,
            'type': self.type,
            'created_at': self.created_at
        }

    @classmethod
    def all(cls, org):
        return cls.select().where(cls.org==org)

    @classmethod
    def members(cls, group_id):
        return User.select().where(peewee.SQL("%s = ANY(groups)", group_id))

    def __unicode__(self):
        return unicode(self.id)


class User(ModelTimestampsMixin, BaseModel, BelongsToOrgMixin, UserMixin, PermissionsCheckMixin):
    id = peewee.PrimaryKeyField()
    org = peewee.ForeignKeyField(Organization, related_name="users")
    name = peewee.CharField(max_length=320)
    email = peewee.CharField(max_length=320)
    password_hash = peewee.CharField(max_length=128, null=True)
    groups = ArrayField(peewee.IntegerField, null=True)
    api_key = peewee.CharField(max_length=40, unique=True)

    class Meta:
        db_table = 'users'

        indexes = (
            (('org', 'email'), True),
        )

    def __init__(self, *args, **kwargs):
        super(User, self).__init__(*args, **kwargs)

    def to_dict(self, with_api_key=False):
        d = {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'gravatar_url': self.gravatar_url,
            'groups': self.groups,
            'updated_at': self.updated_at,
            'created_at': self.created_at
        }

        if self.password_hash is None:
            d['auth_type'] = 'external'
        else:
            d['auth_type'] = 'password'

        if with_api_key:
            d['api_key'] = self.api_key

        return d

    def pre_save(self, created):
        super(User, self).pre_save(created)

        if not self.api_key:
            self.api_key = generate_token(40)

    @property
    def gravatar_url(self):
        email_md5 = hashlib.md5(self.email.lower()).hexdigest()
        return "https://www.gravatar.com/avatar/%s?s=40" % email_md5

    @property
    def permissions(self):
        # TODO: this should be cached.
        return list(itertools.chain(*[g.permissions for g in
                                      Group.select().where(Group.id << self.groups)]))

    @classmethod
    def get_by_email_and_org(cls, email, org):
        return cls.get(cls.email == email, cls.org == org)

    @classmethod
    def get_by_api_key_and_org(cls, api_key, org):
        return cls.get(cls.api_key == api_key, cls.org == org)

    @classmethod
    def all(cls, org):
        return cls.select().where(cls.org == org)

    def __unicode__(self):
        return u'%s (%s)' % (self.name, self.email)

    def hash_password(self, password):
        self.password_hash = pwd_context.encrypt(password)

    def verify_password(self, password):
        return self.password_hash and pwd_context.verify(password, self.password_hash)


class ConfigurationField(peewee.TextField):
    def db_value(self, value):
        return value.to_json()

    def python_value(self, value):
        return ConfigurationContainer.from_json(value)


class DataSource(BelongsToOrgMixin, BaseModel):
    id = peewee.PrimaryKeyField()
    org = peewee.ForeignKeyField(Organization, related_name="data_sources")
    name = peewee.CharField()
    type = peewee.CharField()
    options = ConfigurationField()
    queue_name = peewee.CharField(default="queries")
    scheduled_queue_name = peewee.CharField(default="scheduled_queries")
    created_at = DateTimeTZField(default=datetime.datetime.now)

    class Meta:
        db_table = 'data_sources'

        indexes = (
            (('org', 'name'), True),
        )

    def to_dict(self, all=False, with_permissions=False):
        d = {
            'id': self.id,
            'name': self.name,
            'type': self.type,
            'syntax': self.query_runner.syntax
        }

        if all:
            schema = get_configuration_schema_for_type(self.type)
            self.options.set_schema(schema)
            d['options'] = self.options.to_dict(mask_secrets=True)
            d['queue_name'] = self.queue_name
            d['scheduled_queue_name'] = self.scheduled_queue_name
            d['groups'] = self.groups

        if with_permissions:
            d['view_only'] = self.data_source_groups.view_only

        return d

    def __unicode__(self):
        return self.name

    @classmethod
    def create_with_group(cls, *args, **kwargs):
        data_source = cls.create(*args, **kwargs)
        DataSourceGroup.create(data_source=data_source, group=data_source.org.default_group)
        return data_source

    def get_schema(self, refresh=False):
        key = "data_source:schema:{}".format(self.id)

        cache = None
        if not refresh:
            cache = redis_connection.get(key)

        if cache is None:
            query_runner = self.query_runner
            schema = sorted(query_runner.get_schema(get_stats=refresh), key=lambda t: t['name'])

            redis_connection.set(key, json.dumps(schema))
        else:
            schema = json.loads(cache)

        return schema

    def add_group(self, group, view_only=False):
        dsg = DataSourceGroup.create(group=group, data_source=self, view_only=view_only)
        setattr(self, 'data_source_groups', dsg)

    def remove_group(self, group):
        DataSourceGroup.delete().where(DataSourceGroup.group==group, DataSourceGroup.data_source==self).execute()

    def update_group_permission(self, group, view_only):
        dsg = DataSourceGroup.get(DataSourceGroup.group==group, DataSourceGroup.data_source==self)
        dsg.view_only = view_only
        dsg.save()
        setattr(self, 'data_source_groups', dsg)

    @property
    def query_runner(self):
        return get_query_runner(self.type, self.options)

    @classmethod
    def all(cls, org, groups=None):
        data_sources = cls.select().where(cls.org==org).order_by(cls.id.asc())

        if groups:
            data_sources = data_sources.join(DataSourceGroup).where(DataSourceGroup.group << groups)

        return data_sources

    @property
    def groups(self):
        groups = DataSourceGroup.select().where(DataSourceGroup.data_source==self)
        return dict(map(lambda g: (g.group_id, g.view_only), groups))


class DataSourceGroup(BaseModel):
    data_source = peewee.ForeignKeyField(DataSource)
    group = peewee.ForeignKeyField(Group, related_name="data_sources")
    view_only = peewee.BooleanField(default=False)

    class Meta:
        db_table = "data_source_groups"


class QueryResult(BaseModel, BelongsToOrgMixin):
    id = peewee.PrimaryKeyField()
    org = peewee.ForeignKeyField(Organization)
    data_source = peewee.ForeignKeyField(DataSource)
    query_hash = peewee.CharField(max_length=32, index=True)
    query = peewee.TextField()
    data = peewee.TextField()
    runtime = peewee.FloatField()
    retrieved_at = DateTimeTZField()

    class Meta:
        db_table = 'query_results'

    def to_dict(self):
        return {
            'id': self.id,
            'query_hash': self.query_hash,
            'query': self.query,
            'data': json.loads(self.data),
            'data_source_id': self.data_source_id,
            'runtime': self.runtime,
            'retrieved_at': self.retrieved_at
        }

    @classmethod
    def unused(cls, days=7):
        age_threshold = datetime.datetime.now() - datetime.timedelta(days=days)

        unused_results = cls.select().where(Query.id == None, cls.retrieved_at < age_threshold)\
            .join(Query, join_type=peewee.JOIN_LEFT_OUTER)

        return unused_results

    @classmethod
    def get_latest(cls, data_source, query, max_age=0):
        query_hash = utils.gen_query_hash(query)

        if max_age == -1:
            query = cls.select().where(cls.query_hash == query_hash,
                                       cls.data_source == data_source).order_by(cls.retrieved_at.desc())
        else:
            query = cls.select().where(cls.query_hash == query_hash, cls.data_source == data_source,
                                       peewee.SQL("retrieved_at + interval '%s second' >= now() at time zone 'utc'",
                                                  max_age)).order_by(cls.retrieved_at.desc())

        return query.first()

    @classmethod
    def store_result(cls, org_id, data_source_id, query_hash, query, data, run_time, retrieved_at):
        query_result = cls.create(org=org_id,
                                  query_hash=query_hash,
                                  query=query,
                                  runtime=run_time,
                                  data_source=data_source_id,
                                  retrieved_at=retrieved_at,
                                  data=data)

        logging.info("Inserted query (%s) data; id=%s", query_hash, query_result.id)

        sql = "UPDATE queries SET latest_query_data_id = %s WHERE query_hash = %s AND data_source_id = %s RETURNING id"
        query_ids = [row[0] for row in db.database.execute_sql(sql, params=(query_result.id, query_hash, data_source_id))]

        # TODO: when peewee with update & returning support is released, we can get back to using this code:
        # updated_count = Query.update(latest_query_data=query_result).\
        #     where(Query.query_hash==query_hash, Query.data_source==data_source_id).\
        #     execute()

        logging.info("Updated %s queries with result (%s).", len(query_ids), query_hash)

        return query_result, query_ids

    def __unicode__(self):
        return u"%d | %s | %s" % (self.id, self.query_hash, self.retrieved_at)

    @property
    def groups(self):
        return self.data_source.groups


def should_schedule_next(previous_iteration, now, schedule):
    if schedule.isdigit():
        ttl = int(schedule)
        next_iteration = previous_iteration + datetime.timedelta(seconds=ttl)
    else:
        hour, minute = schedule.split(':')
        hour, minute = int(hour), int(minute)

        # The following logic is needed for cases like the following:
        # - The query scheduled to run at 23:59.
        # - The scheduler wakes up at 00:01.
        # - Using naive implementation of comparing timestamps, it will skip the execution.
        normalized_previous_iteration = previous_iteration.replace(hour=hour, minute=minute)
        if normalized_previous_iteration > previous_iteration:
            previous_iteration = normalized_previous_iteration - datetime.timedelta(days=1)

        next_iteration = (previous_iteration + datetime.timedelta(days=1)).replace(hour=hour, minute=minute)

    return now > next_iteration


class Query(ModelTimestampsMixin, BaseModel, BelongsToOrgMixin):
    id = peewee.PrimaryKeyField()
    org = peewee.ForeignKeyField(Organization, related_name="queries")
    data_source = peewee.ForeignKeyField(DataSource, null=True)
    latest_query_data = peewee.ForeignKeyField(QueryResult, null=True)
    name = peewee.CharField(max_length=255)
    description = peewee.CharField(max_length=4096, null=True)
    query = peewee.TextField()
    query_hash = peewee.CharField(max_length=32)
    api_key = peewee.CharField(max_length=40)
    user_email = peewee.CharField(max_length=360, null=True)
    user = peewee.ForeignKeyField(User)
    last_modified_by = peewee.ForeignKeyField(User, null=True, related_name="modified_queries")
    is_archived = peewee.BooleanField(default=False, index=True)
    schedule = peewee.CharField(max_length=10, null=True)

    class Meta:
        db_table = 'queries'

    def to_dict(self, with_stats=False, with_visualizations=False, with_user=True, with_last_modified_by=True):
        d = {
            'id': self.id,
            'latest_query_data_id': self._data.get('latest_query_data', None),
            'name': self.name,
            'description': self.description,
            'query': self.query,
            'query_hash': self.query_hash,
            'schedule': self.schedule,
            'api_key': self.api_key,
            'is_archived': self.is_archived,
            'updated_at': self.updated_at,
            'created_at': self.created_at,
            'data_source_id': self.data_source_id
        }

        if with_user:
            d['user'] = self.user.to_dict()
        else:
            d['user_id'] = self.user_id

        if with_last_modified_by:
            d['last_modified_by'] = self.last_modified_by.to_dict() if self.last_modified_by is not None else None
        else:
            d['last_modified_by_id'] = self.last_modified_by_id


        if with_stats:
            d['retrieved_at'] = self.retrieved_at
            d['runtime'] = self.runtime

        if with_visualizations:
            d['visualizations'] = [vis.to_dict(with_query=False)
                                   for vis in self.visualizations]

        return d

    def archive(self):
        self.is_archived = True
        self.schedule = None

        for vis in self.visualizations:
            for w in vis.widgets:
                w.delete_instance()

        self.save()

    @classmethod
    def all_queries(cls, groups):
        q = Query.select(Query, User, QueryResult.retrieved_at, QueryResult.runtime)\
            .join(QueryResult, join_type=peewee.JOIN_LEFT_OUTER)\
            .switch(Query).join(User)\
            .join(DataSourceGroup, on=(Query.data_source==DataSourceGroup.data_source))\
            .where(Query.is_archived==False)\
            .where(DataSourceGroup.group << groups)\
            .group_by(Query.id, User.id, QueryResult.id, QueryResult.retrieved_at, QueryResult.runtime)\
            .order_by(cls.created_at.desc())

        return q

    @classmethod
    def outdated_queries(cls):
        queries = cls.select(cls, QueryResult.retrieved_at, DataSource)\
            .join(QueryResult)\
            .switch(Query).join(DataSource)\
            .where(cls.schedule != None)

        now = utils.utcnow()
        outdated_queries = {}
        for query in queries:
            if should_schedule_next(query.latest_query_data.retrieved_at, now, query.schedule):
                key = "{}:{}".format(query.query_hash, query.data_source.id)
                outdated_queries[key] = query

        return outdated_queries.values()

    @classmethod
    def search(cls, term, groups):
        # TODO: This is very naive implementation of search, to be replaced with PostgreSQL full-text-search solution.

        where = (cls.name**u"%{}%".format(term)) | (cls.description**u"%{}%".format(term))

        if term.isdigit():
            where |= cls.id == term

        where &= cls.is_archived == False

        return cls.select()\
                  .join(DataSourceGroup, on=(Query.data_source==DataSourceGroup.data_source)) \
                  .where(where) \
                  .where(DataSourceGroup.group << groups)\
                  .order_by(cls.created_at.desc())

    @classmethod
    def recent(cls, groups, user_id=None, limit=20):
        query = cls.select(Query, User).where(Event.created_at > peewee.SQL("current_date - 7")).\
            join(Event, on=(Query.id == Event.object_id.cast('integer'))). \
            join(DataSourceGroup, on=(Query.data_source==DataSourceGroup.data_source)). \
            switch(Query).join(User).\
            where(Event.action << ('edit', 'execute', 'edit_name', 'edit_description', 'view_source')).\
            where(~(Event.object_id >> None)).\
            where(Event.object_type == 'query'). \
            where(DataSourceGroup.group << groups).\
            where(cls.is_archived == False).\
            group_by(Event.object_id, Query.id, User.id).\
            order_by(peewee.SQL("count(0) desc"))

        if user_id:
            query = query.where(Event.user == user_id)

        query = query.limit(limit)

        return query

    def pre_save(self, created):
        super(Query, self).pre_save(created)
        self.query_hash = utils.gen_query_hash(self.query)
        self._set_api_key()

        if self.last_modified_by is None:
            self.last_modified_by = self.user

    def post_save(self, created):
        if created:
            self._create_default_visualizations()

    def _create_default_visualizations(self):
        table_visualization = Visualization(query=self, name="Table",
                                            description='',
                                            type="TABLE", options="{}")
        table_visualization.save()

    def _set_api_key(self):
        if not self.api_key:
            self.api_key = hashlib.sha1(
                u''.join((str(time.time()), self.query, str(self.user_id), self.name)).encode('utf-8')).hexdigest()

    @property
    def runtime(self):
        return self.latest_query_data.runtime

    @property
    def retrieved_at(self):
        return self.latest_query_data.retrieved_at

    @property
    def groups(self):
        if self.data_source is None:
            return {}

        return self.data_source.groups

    def __unicode__(self):
        return unicode(self.id)


class Alert(ModelTimestampsMixin, BaseModel):
    UNKNOWN_STATE = 'unknown'
    OK_STATE = 'ok'
    TRIGGERED_STATE = 'triggered'

    id = peewee.PrimaryKeyField()
    name = peewee.CharField()
    query = peewee.ForeignKeyField(Query, related_name='alerts')
    user = peewee.ForeignKeyField(User, related_name='alerts')
    options = JSONField()
    state = peewee.CharField(default=UNKNOWN_STATE)
    last_triggered_at = DateTimeTZField(null=True)
    rearm = peewee.IntegerField(null=True)

    class Meta:
        db_table = 'alerts'

    @classmethod
    def all(cls, groups):
        return cls.select(Alert, User, Query)\
            .join(Query)\
            .join(DataSourceGroup, on=(Query.data_source==DataSourceGroup.data_source))\
            .where(DataSourceGroup.group << groups)\
            .switch(Alert)\
            .join(User)

    @classmethod
    def get_by_id_and_org(cls, id, org):
        return cls.select(Alert, User, Query).join(Query).switch(Alert).join(User).where(cls.id==id, Query.org==org).get()

    def to_dict(self, full=True):
        d = {
            'id': self.id,
            'name': self.name,
            'options': self.options,
            'state': self.state,
            'last_triggered_at': self.last_triggered_at,
            'updated_at': self.updated_at,
            'created_at': self.created_at,
            'rearm': self.rearm
        }

        if full:
            d['query'] = self.query.to_dict()
            d['user'] = self.user.to_dict()
        else:
            d['query_id'] = self.query_id
            d['user_id'] = self.user_id

        return d

    def evaluate(self):
        data = json.loads(self.query.latest_query_data.data)
        # todo: safe guard for empty
        value = data['rows'][0][self.options['column']]
        op = self.options['op']

        if op == 'greater than' and value > self.options['value']:
            new_state = self.TRIGGERED_STATE
        elif op == 'less than' and value < self.options['value']:
            new_state = self.TRIGGERED_STATE
        elif op == 'equals' and value == self.options['value']:
            new_state = self.TRIGGERED_STATE
        else:
            new_state = self.OK_STATE

        return new_state

    def subscribers(self):
        return User.select().join(AlertSubscription).where(AlertSubscription.alert==self)

    @property
    def groups(self):
        return self.query.groups


class AlertSubscription(ModelTimestampsMixin, BaseModel):
    user = peewee.ForeignKeyField(User)
    alert = peewee.ForeignKeyField(Alert)

    class Meta:
        db_table = 'alert_subscriptions'

    def to_dict(self):
        return {
            'user': self.user.to_dict(),
            'alert_id': self.alert_id
        }

    @classmethod
    def all(cls, alert_id):
        return AlertSubscription.select(AlertSubscription, User).join(User).where(AlertSubscription.alert==alert_id)

    @classmethod
    def unsubscribe(cls, alert_id, user_id):
        query = AlertSubscription.delete().where(AlertSubscription.alert==alert_id).where(AlertSubscription.user==user_id)
        return query.execute()


class Dashboard(ModelTimestampsMixin, BaseModel, BelongsToOrgMixin):
    id = peewee.PrimaryKeyField()
    org = peewee.ForeignKeyField(Organization, related_name="dashboards")
    slug = peewee.CharField(max_length=140, index=True)
    name = peewee.CharField(max_length=100)
    user_email = peewee.CharField(max_length=360, null=True)
    user = peewee.ForeignKeyField(User)
    layout = peewee.TextField()
    dashboard_filters_enabled = peewee.BooleanField(default=False)
    is_archived = peewee.BooleanField(default=False, index=True)

    class Meta:
        db_table = 'dashboards'

    def to_dict(self, with_widgets=False, user=None):
        layout = json.loads(self.layout)

        if with_widgets:
            widget_list = Widget.select(Widget, Visualization, Query, User)\
                .where(Widget.dashboard == self.id)\
                .join(Visualization, join_type=peewee.JOIN_LEFT_OUTER)\
                .join(Query, join_type=peewee.JOIN_LEFT_OUTER)\
                .join(User, join_type=peewee.JOIN_LEFT_OUTER)

            widgets = {}

            for w in widget_list:
                if w.visualization_id is None:
                    widgets[w.id] = w.to_dict()
                elif user and has_access(w.visualization.query.groups, user, view_only):
                    widgets[w.id] = w.to_dict()
                else:
                    widgets[w.id] = project(w.to_dict(),
                                            ('id', 'width', 'dashboard_id', 'options', 'created_at', 'updated_at'))
                    widgets[w.id]['restricted'] = True

            # The following is a workaround for cases when the widget object gets deleted without the dashboard layout
            # updated. This happens for users with old databases that didn't have a foreign key relationship between
            # visualizations and widgets.
            # It's temporary until better solution is implemented (we probably should move the position information
            # to the widget).
            widgets_layout = []
            for row in layout:
                new_row = []
                for widget_id in row:
                    widget = widgets.get(widget_id, None)
                    if widget:
                        new_row.append(widget)

                widgets_layout.append(new_row)

            # widgets_layout = map(lambda row: map(lambda widget_id: widgets.get(widget_id, None), row), layout)
        else:
            widgets_layout = None

        return {
            'id': self.id,
            'slug': self.slug,
            'name': self.name,
            'user_id': self.user_id,
            'layout': layout,
            'dashboard_filters_enabled': self.dashboard_filters_enabled,
            'widgets': widgets_layout,
            'is_archived': self.is_archived,
            'updated_at': self.updated_at,
            'created_at': self.created_at
        }

    @classmethod
    def all(cls, org):
        return cls.select().where(cls.org==org, cls.is_archived==False)

    @classmethod
    def get_by_slug_and_org(cls, slug, org):
        return cls.get(cls.slug == slug, cls.org==org)

    @classmethod
    def recent(cls, org, user_id=None, limit=20):
        query = cls.select().where(Event.created_at > peewee.SQL("current_date - 7")). \
            join(Event, on=(Dashboard.id == Event.object_id.cast('integer'))). \
            where(Event.action << ('edit', 'view')).\
            where(~(Event.object_id >> None)). \
            where(Event.object_type == 'dashboard'). \
            where(Dashboard.is_archived == False). \
            where(Dashboard.org == org).\
            group_by(Event.object_id, Dashboard.id). \
            order_by(peewee.SQL("count(0) desc"))

        if user_id:
            query = query.where(Event.user == user_id)

        query = query.limit(limit)

        return query

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = utils.slugify(self.name)

            tries = 1
            while self.select().where(Dashboard.slug == self.slug).first() is not None:
                self.slug = utils.slugify(self.name) + "_{0}".format(tries)
                tries += 1

        super(Dashboard, self).save(*args, **kwargs)

    def __unicode__(self):
        return u"%s=%s" % (self.id, self.name)


class Visualization(ModelTimestampsMixin, BaseModel):
    id = peewee.PrimaryKeyField()
    type = peewee.CharField(max_length=100)
    query = peewee.ForeignKeyField(Query, related_name='visualizations')
    name = peewee.CharField(max_length=255)
    description = peewee.CharField(max_length=4096, null=True)
    options = peewee.TextField()

    class Meta:
        db_table = 'visualizations'

    def to_dict(self, with_query=True):
        d = {
            'id': self.id,
            'type': self.type,
            'name': self.name,
            'description': self.description,
            'options': json.loads(self.options),
            'updated_at': self.updated_at,
            'created_at': self.created_at
        }

        if with_query:
            d['query'] = self.query.to_dict()

        return d

    @classmethod
    def get_by_id_and_org(cls, visualization_id, org):
        return cls.select(Visualization, Query).join(Query).where(cls.id == visualization_id,
                                                                  Query.org == org).get()

    def __unicode__(self):
        return u"%s %s" % (self.id, self.type)


class Widget(ModelTimestampsMixin, BaseModel):
    id = peewee.PrimaryKeyField()
    visualization = peewee.ForeignKeyField(Visualization, related_name='widgets', null=True)
    text = peewee.TextField(null=True)
    width = peewee.IntegerField()
    options = peewee.TextField()
    dashboard = peewee.ForeignKeyField(Dashboard, related_name='widgets', index=True)

    # unused; kept for backward compatability:
    type = peewee.CharField(max_length=100, null=True)
    query_id = peewee.IntegerField(null=True)

    class Meta:
        db_table = 'widgets'

    def to_dict(self):
        d = {
            'id': self.id,
            'width': self.width,
            'options': json.loads(self.options),
            'dashboard_id': self.dashboard_id,
            'text': self.text,
            'updated_at': self.updated_at,
            'created_at': self.created_at
        }

        if self.visualization and self.visualization.id:
            d['visualization'] = self.visualization.to_dict()

        return d

    def __unicode__(self):
        return u"%s" % self.id

    @classmethod
    def get_by_id_and_org(cls, widget_id, org):
        return cls.select(cls, Dashboard).join(Dashboard).where(cls.id == widget_id, Dashboard.org == org).get()

    def delete_instance(self, *args, **kwargs):
        layout = json.loads(self.dashboard.layout)
        layout = map(lambda row: filter(lambda w: w != self.id, row), layout)
        layout = filter(lambda row: len(row) > 0, layout)
        self.dashboard.layout = json.dumps(layout)
        self.dashboard.save()
        super(Widget, self).delete_instance(*args, **kwargs)


class Event(BaseModel):
    org = peewee.ForeignKeyField(Organization, related_name="events")
    user = peewee.ForeignKeyField(User, related_name="events", null=True)
    action = peewee.CharField()
    object_type = peewee.CharField()
    object_id = peewee.CharField(null=True)
    additional_properties = peewee.TextField(null=True)
    created_at = DateTimeTZField(default=datetime.datetime.now)

    class Meta:
        db_table = 'events'

    def __unicode__(self):
        return u"%s,%s,%s,%s" % (self.user_id, self.action, self.object_type, self.object_id)

    @classmethod
    def record(cls, event):
        org = event.pop('org_id')
        user = event.pop('user_id')
        action = event.pop('action')
        object_type = event.pop('object_type')
        object_id = event.pop('object_id', None)

        created_at = datetime.datetime.utcfromtimestamp(event.pop('timestamp'))
        additional_properties = json.dumps(event)

        event = cls.create(org=org, user=user, action=action, object_type=object_type, object_id=object_id,
                           additional_properties=additional_properties, created_at=created_at)

        return event


all_models = (Organization, Group, DataSource, DataSourceGroup, User, QueryResult, Query, Alert, AlertSubscription, Dashboard, Visualization, Widget, Event)


def init_db():
    default_org = Organization.create(name="Default", slug='default', settings={})
    admin_group = Group.create(name='admin', permissions=['admin', 'super_admin'], org=default_org, type=Group.BUILTIN_GROUP)
    default_group = Group.create(name='default', permissions=Group.DEFAULT_PERMISSIONS, org=default_org, type=Group.BUILTIN_GROUP)

    return default_org, admin_group, default_group


def create_db(create_tables, drop_tables):
    db.connect_db()

    for model in all_models:
        if drop_tables and model.table_exists():
            model.drop_table(cascade=True)

        if create_tables and not model.table_exists():
            model.create_table()

    db.close_db(None)
