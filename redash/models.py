import json
import hashlib
import logging
import os
import threading
import time
import datetime
import itertools

import peewee
from passlib.apps import custom_app_context as pwd_context
from playhouse.postgres_ext import ArrayField, DateTimeTZField, PostgresqlExtDatabase
from flask.ext.login import UserMixin, AnonymousUserMixin

from redash import utils, settings, redis_connection
from redash.query_runner import get_query_runner
from utils import generate_token


class Database(object):
    def __init__(self):
        self.database_config = dict(settings.DATABASE_CONFIG)
        self.database_config['register_hstore'] = False
        self.database_name = self.database_config.pop('name')
        self.database = PostgresqlExtDatabase(self.database_name, **self.database_config)
        self.app = None
        self.pid = os.getpid()

    def init_app(self, app):
        self.app = app
        self.register_handlers()

    def connect_db(self):
        self._check_pid()
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


class BaseModel(peewee.Model):
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

        dirty_fields = self.dirty_fields
        if hasattr(self, 'updated_at'):
            dirty_fields = dirty_fields + [self.__class__.updated_at]

        self.save(only=dirty_fields)


class ModelTimestampsMixin(BaseModel):
    updated_at = DateTimeTZField(default=datetime.datetime.now)
    created_at = DateTimeTZField(default=datetime.datetime.now)

    def pre_save(self, created):
        super(ModelTimestampsMixin, self).pre_save(created)

        self.updated_at = datetime.datetime.now()


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
    def __init__(self, api_key):
        self.id = api_key

    def __repr__(self):
        return u"<ApiUser: {}>".format(self.id)

    @property
    def permissions(self):
        return ['view_query']


class Group(BaseModel):
    DEFAULT_PERMISSIONS = ['create_dashboard', 'create_query', 'edit_dashboard', 'edit_query',
                           'view_query', 'view_source', 'execute_query', 'list_users']

    id = peewee.PrimaryKeyField()
    name = peewee.CharField(max_length=100)
    permissions = ArrayField(peewee.CharField, default=DEFAULT_PERMISSIONS)
    tables = ArrayField(peewee.CharField)
    created_at = DateTimeTZField(default=datetime.datetime.now)

    class Meta:
        db_table = 'groups'

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'permissions': self.permissions,
            'tables': self.tables,
            'created_at': self.created_at
        }

    def __unicode__(self):
        return unicode(self.id)


class User(ModelTimestampsMixin, BaseModel, UserMixin, PermissionsCheckMixin):
    DEFAULT_GROUPS = ['default']

    id = peewee.PrimaryKeyField()
    name = peewee.CharField(max_length=320)
    email = peewee.CharField(max_length=320, index=True, unique=True)
    password_hash = peewee.CharField(max_length=128, null=True)
    groups = ArrayField(peewee.CharField, default=DEFAULT_GROUPS)
    api_key = peewee.CharField(max_length=40, unique=True)

    class Meta:
        db_table = 'users'

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

    def __init__(self, *args, **kwargs):
        super(User, self).__init__(*args, **kwargs)
        self._allowed_tables = None

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
                                      Group.select().where(Group.name << self.groups)]))

    @property
    def allowed_tables(self):
        # TODO: cache this as weel
        if self._allowed_tables is None:
            self._allowed_tables = set([t.lower() for t in itertools.chain(*[g.tables for g in
                                        Group.select().where(Group.name << self.groups)])])

        return self._allowed_tables

    @classmethod
    def get_by_email(cls, email):
        return cls.get(cls.email == email)

    @classmethod
    def get_by_api_key(cls, api_key):
        return cls.get(cls.api_key == api_key)

    def __unicode__(self):
        return u'%s (%s)' % (self.name, self.email)

    def hash_password(self, password):
        self.password_hash = pwd_context.encrypt(password)

    def verify_password(self, password):
        return self.password_hash and pwd_context.verify(password, self.password_hash)


class ActivityLog(BaseModel):
    QUERY_EXECUTION = 1

    id = peewee.PrimaryKeyField()
    user = peewee.ForeignKeyField(User)
    type = peewee.IntegerField()
    activity = peewee.TextField()
    created_at = DateTimeTZField(default=datetime.datetime.now)

    class Meta:
        db_table = 'activity_log'

    def to_dict(self):
        return {
            'id': self.id,
            'user': self.user.to_dict(),
            'type': self.type,
            'activity': self.activity,
            'created_at': self.created_at
        }

    def __unicode__(self):
        return unicode(self.id)


class DataSource(BaseModel):
    SECRET_PLACEHOLDER = '--------'

    id = peewee.PrimaryKeyField()
    name = peewee.CharField(unique=True)
    type = peewee.CharField()
    options = peewee.TextField()
    queue_name = peewee.CharField(default="queries")
    scheduled_queue_name = peewee.CharField(default="scheduled_queries")
    created_at = DateTimeTZField(default=datetime.datetime.now)

    class Meta:
        db_table = 'data_sources'

    def to_dict(self, all=False):
        d = {
            'id': self.id,
            'name': self.name,
            'type': self.type,
            'syntax': self.query_runner.syntax
        }

        if all:
            d['options'] = self.configuration
            d['queue_name'] = self.queue_name
            d['scheduled_queue_name'] = self.scheduled_queue_name

        return d

    def __unicode__(self):
        return self.name

    @property
    def configuration(self):
        configuration = json.loads(self.options)
        schema = self.query_runner.configuration_schema()
        for prop in schema.get('secret', []):
            if prop in configuration and configuration[prop]:
                configuration[prop] = self.SECRET_PLACEHOLDER

        return configuration

    def replace_secret_placeholders(self, configuration):
        current_configuration = json.loads(self.options)
        schema = self.query_runner.configuration_schema()
        for prop in schema.get('secret', []):
            if prop in configuration and configuration[prop] == self.SECRET_PLACEHOLDER:
                configuration[prop] = current_configuration[prop]

    def get_schema(self, refresh=False):
        key = "data_source:schema:{}".format(self.id)

        cache = None
        if not refresh:
            cache = redis_connection.get(key)

        if cache is None:
            query_runner = self.query_runner
            schema = sorted(query_runner.get_schema(), key=lambda t: t['name'])

            redis_connection.set(key, json.dumps(schema))
        else:
            schema = json.loads(cache)

        return schema

    @property
    def query_runner(self):
        return get_query_runner(self.type, self.options)

    @classmethod
    def all(cls):
        return cls.select().order_by(cls.id.asc())


class JSONField(peewee.TextField):
    def db_value(self, value):
        return json.dumps(value)

    def python_value(self, value):
        return json.loads(value)


class QueryResult(BaseModel):
    id = peewee.PrimaryKeyField()
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
            'data_source_id': self._data.get('data_source', None),
            'runtime': self.runtime,
            'retrieved_at': self.retrieved_at
        }

    @classmethod
    def unused(cls):
        week_ago = datetime.datetime.now() - datetime.timedelta(days=7)

        unused_results = cls.select().where(Query.id == None, cls.retrieved_at < week_ago)\
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
    def store_result(cls, data_source_id, query_hash, query, data, run_time, retrieved_at):
        query_result = cls.create(query_hash=query_hash,
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


class Query(ModelTimestampsMixin, BaseModel):
    id = peewee.PrimaryKeyField()
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

    def to_dict(self, with_stats=False, with_visualizations=False, with_user=True):
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
            'data_source_id': self._data.get('data_source', None)
        }

        if with_user:
            d['user'] = self.user.to_dict()
            d['last_modified_by'] = self.last_modified_by.to_dict() if self.last_modified_by is not None else None
        else:
            d['user_id'] = self._data['user']

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
    def all_queries(cls):
        q = Query.select(Query, User, QueryResult.retrieved_at, QueryResult.runtime)\
            .join(QueryResult, join_type=peewee.JOIN_LEFT_OUTER)\
            .switch(Query).join(User)\
            .where(Query.is_archived==False)\
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
    def search(cls, term):
        # This is very naive implementation of search, to be replaced with PostgreSQL full-text-search solution.

        where = (cls.name**u"%{}%".format(term)) | (cls.description**u"%{}%".format(term))

        if term.isdigit():
            where |= cls.id == term

        where &= cls.is_archived == False

        return cls.select().where(where).order_by(cls.created_at.desc())

    @classmethod
    def recent(cls, user_id=None, limit=20):
        # TODO: instead of t2 here, we should define table_alias for Query table
        query = cls.select().where(Event.created_at > peewee.SQL("current_date - 7")).\
            join(Event, on=(Query.id == peewee.SQL("t2.object_id::integer"))).\
            where(Event.action << ('edit', 'execute', 'edit_name', 'edit_description', 'view_source')).\
            where(~(Event.object_id >> None)).\
            where(Event.object_type == 'query'). \
            where(cls.is_archived == False).\
            group_by(Event.object_id, Query.id).\
            order_by(peewee.SQL("count(0) desc"))

        if user_id:
            query = query.where(Event.user == user_id)

        query = query.limit(limit)

        return query

    @classmethod
    def update_instance(cls, query_id, **kwargs):
        if 'query' in kwargs:
            kwargs['query_hash'] = utils.gen_query_hash(kwargs['query'])

        update = cls.update(**kwargs).where(cls.id == query_id)
        return update.execute()

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
                u''.join((str(time.time()), self.query, str(self._data['user']), self.name)).encode('utf-8')).hexdigest()

    @property
    def runtime(self):
        return self.latest_query_data.runtime

    @property
    def retrieved_at(self):
        return self.latest_query_data.retrieved_at

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

    class Meta:
        db_table = 'alerts'

    @classmethod
    def all(cls):
        return cls.select(Alert, User, Query).join(Query).switch(Alert).join(User)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'query': self.query.to_dict(),
            'user': self.user.to_dict(),
            'options': self.options,
            'state': self.state,
            'last_triggered_at': self.last_triggered_at,
            'updated_at': self.updated_at,
            'created_at': self.created_at
        }

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


class AlertSubscription(ModelTimestampsMixin, BaseModel):
    user = peewee.ForeignKeyField(User)
    alert = peewee.ForeignKeyField(Alert)

    class Meta:
        db_table = 'alert_subscriptions'

    def to_dict(self):
        return {
            'user': self.user.to_dict(),
            'alert_id': self._data['alert']
        }

    @classmethod
    def all(cls, alert_id):
        return AlertSubscription.select(AlertSubscription, User).join(User).where(AlertSubscription.alert==alert_id)

    @classmethod
    def unsubscribe(cls, alert_id, user_id):
        query = AlertSubscription.delete().where(AlertSubscription.alert==alert_id).where(AlertSubscription.user==user_id)
        return query.execute()


class Dashboard(ModelTimestampsMixin, BaseModel):
    id = peewee.PrimaryKeyField()
    slug = peewee.CharField(max_length=140, index=True)
    name = peewee.CharField(max_length=100)
    user_email = peewee.CharField(max_length=360, null=True)
    user = peewee.ForeignKeyField(User)
    layout = peewee.TextField()
    dashboard_filters_enabled = peewee.BooleanField(default=False)
    is_archived = peewee.BooleanField(default=False, index=True)

    class Meta:
        db_table = 'dashboards'

    def to_dict(self, with_widgets=False):
        layout = json.loads(self.layout)

        if with_widgets:
            widgets = Widget.select(Widget, Visualization, Query, User)\
                .where(Widget.dashboard == self.id)\
                .join(Visualization, join_type=peewee.JOIN_LEFT_OUTER)\
                .join(Query, join_type=peewee.JOIN_LEFT_OUTER)\
                .join(User, join_type=peewee.JOIN_LEFT_OUTER)
            widgets = {w.id: w.to_dict() for w in widgets}

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
            'user_id': self._data['user'],
            'layout': layout,
            'dashboard_filters_enabled': self.dashboard_filters_enabled,
            'widgets': widgets_layout,
            'is_archived': self.is_archived,
            'updated_at': self.updated_at,
            'created_at': self.created_at
        }

    @classmethod
    def get_by_slug(cls, slug):
        return cls.get(cls.slug == slug)

    @classmethod
    def recent(cls, user_id=None, limit=20):
        query = cls.select().where(Event.created_at > peewee.SQL("current_date - 7")). \
            join(Event, on=(Dashboard.id == peewee.SQL("t2.object_id::integer"))). \
            where(Event.action << ('edit', 'view')).\
            where(~(Event.object_id >> None)). \
            where(Event.object_type == 'dashboard'). \
            where(Dashboard.is_archived == False). \
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
            'dashboard_id': self._data['dashboard'],
            'text': self.text,
            'updated_at': self.updated_at,
            'created_at': self.created_at
        }

        if self.visualization and self.visualization.id:
            d['visualization'] = self.visualization.to_dict()

        return d
    
    def __unicode__(self):
        return u"%s" % self.id

    def delete_instance(self, *args, **kwargs):
        layout = json.loads(self.dashboard.layout)
        layout = map(lambda row: filter(lambda w: w != self.id, row), layout)
        layout = filter(lambda row: len(row) > 0, layout)
        self.dashboard.layout = json.dumps(layout)
        self.dashboard.save()
        super(Widget, self).delete_instance(*args, **kwargs)


class Event(BaseModel):
    user = peewee.ForeignKeyField(User, related_name="events", null=True)
    action = peewee.CharField()
    object_type = peewee.CharField()
    object_id = peewee.CharField(null=True)
    additional_properties = peewee.TextField(null=True)
    created_at = DateTimeTZField(default=datetime.datetime.now)

    class Meta:
        db_table = 'events'

    def __unicode__(self):
        return u"%s,%s,%s,%s" % (self._data['user'], self.action, self.object_type, self.object_id)

    @classmethod
    def record(cls, event):
        user = event.pop('user_id')
        action = event.pop('action')
        object_type = event.pop('object_type')
        object_id = event.pop('object_id', None)

        created_at = datetime.datetime.utcfromtimestamp(event.pop('timestamp'))
        additional_properties = json.dumps(event)

        event = cls.create(user=user, action=action, object_type=object_type, object_id=object_id,
                           additional_properties=additional_properties, created_at=created_at)

        return event


all_models = (DataSource, User, QueryResult, Query, Alert, Dashboard, Visualization, Widget, ActivityLog, Group, Event)


def init_db():
    Group.insert(name='admin', permissions=['admin'], tables=['*']).execute()
    Group.insert(name='default', permissions=Group.DEFAULT_PERMISSIONS, tables=['*']).execute()


def create_db(create_tables, drop_tables):
    db.connect_db()

    for model in all_models:
        if drop_tables and model.table_exists():
            # TODO: submit PR to peewee to allow passing cascade option to drop_table.
            db.database.execute_sql('DROP TABLE %s CASCADE' % model._meta.db_table)

        if create_tables and not model.table_exists():
            model.create_table()

    db.close_db(None)
