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
from playhouse.postgres_ext import ArrayField
from flask.ext.login import UserMixin, AnonymousUserMixin

from redash import utils, settings


class Database(object):
    def __init__(self):
        self.database_config = dict(settings.DATABASE_CONFIG)
        self.database_name = self.database_config.pop('name')
        self.database = peewee.PostgresqlDatabase(self.database_name, **self.database_config)
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


class AnonymousUser(AnonymousUserMixin):
    @property
    def permissions(self):
        return []


class ApiUser(UserMixin):
    def __init__(self, api_key):
        self.id = api_key

    @property
    def permissions(self):
        return ['view_query']


class Group(BaseModel):
    DEFAULT_PERMISSIONS = ['create_dashboard', 'create_query', 'edit_dashboard', 'edit_query',
                           'view_query', 'view_source', 'execute_query']

    id = peewee.PrimaryKeyField()
    name = peewee.CharField(max_length=100)
    permissions = ArrayField(peewee.CharField, default=DEFAULT_PERMISSIONS)
    tables = ArrayField(peewee.CharField)
    created_at = peewee.DateTimeField(default=datetime.datetime.now)

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


class User(BaseModel, UserMixin):
    DEFAULT_GROUPS = ['default']

    id = peewee.PrimaryKeyField()
    name = peewee.CharField(max_length=320)
    email = peewee.CharField(max_length=320, index=True, unique=True)
    password_hash = peewee.CharField(max_length=128, null=True)
    groups = ArrayField(peewee.CharField, default=DEFAULT_GROUPS)

    class Meta:
        db_table = 'users'

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email
        }

    def __init__(self, *args, **kwargs):
        super(User, self).__init__(*args, **kwargs)
        self._allowed_tables = None

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

    def __unicode__(self):
        return '%r, %r' % (self.name, self.email)

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
    created_at = peewee.DateTimeField(default=datetime.datetime.now)

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
    id = peewee.PrimaryKeyField()
    name = peewee.CharField()
    type = peewee.CharField()
    options = peewee.TextField()
    queue_name = peewee.CharField(default="queries")
    scheduled_queue_name = peewee.CharField(default="queries")
    created_at = peewee.DateTimeField(default=datetime.datetime.now)

    class Meta:
        db_table = 'data_sources'

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'type': self.type
        }


class QueryResult(BaseModel):
    id = peewee.PrimaryKeyField()
    data_source = peewee.ForeignKeyField(DataSource)
    query_hash = peewee.CharField(max_length=32, index=True)
    query = peewee.TextField()
    data = peewee.TextField()
    runtime = peewee.FloatField()
    retrieved_at = peewee.DateTimeField()

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
    def get_latest(cls, data_source, query, ttl=0):
        query_hash = utils.gen_query_hash(query)

        if ttl == -1:
            query = cls.select().where(cls.query_hash == query_hash,
                                       cls.data_source == data_source).order_by(cls.retrieved_at.desc())
        else:
            query = cls.select().where(cls.query_hash == query_hash, cls.data_source == data_source,
                                       peewee.SQL("retrieved_at + interval '%s second' >= now() at time zone 'utc'",
                                                  ttl)).order_by(cls.retrieved_at.desc())

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

        updated_count = Query.update(latest_query_data=query_result).\
            where(Query.query_hash==query_hash, Query.data_source==data_source_id).\
            execute()

        logging.info("Updated %s queries with result (%s).", updated_count, query_hash)

        return query_result

    def __unicode__(self):
        return u"%d | %s | %s" % (self.id, self.query_hash, self.retrieved_at)


class Query(BaseModel):
    id = peewee.PrimaryKeyField()
    data_source = peewee.ForeignKeyField(DataSource)
    latest_query_data = peewee.ForeignKeyField(QueryResult, null=True)
    name = peewee.CharField(max_length=255)
    description = peewee.CharField(max_length=4096, null=True)
    query = peewee.TextField()
    query_hash = peewee.CharField(max_length=32)
    api_key = peewee.CharField(max_length=40)
    ttl = peewee.IntegerField()
    user_email = peewee.CharField(max_length=360, null=True)
    user = peewee.ForeignKeyField(User)
    created_at = peewee.DateTimeField(default=datetime.datetime.now)

    class Meta:
        db_table = 'queries'

    def create_default_visualizations(self):
        table_visualization = Visualization(query=self, name="Table",
                                            description='',
                                            type="TABLE", options="{}")
        table_visualization.save()

    def to_dict(self, with_stats=False, with_visualizations=False, with_user=True):
        d = {
            'id': self.id,
            'latest_query_data_id': self._data.get('latest_query_data', None),
            'name': self.name,
            'description': self.description,
            'query': self.query,
            'query_hash': self.query_hash,
            'ttl': self.ttl,
            'api_key': self.api_key,
            'created_at': self.created_at,
            'data_source_id': self._data.get('data_source', None)
        }

        if with_user:
            d['user'] = self.user.to_dict()
        else:
            d['user_id'] = self._data['user']

        if with_stats:
            d['avg_runtime'] = self.avg_runtime
            d['min_runtime'] = self.min_runtime
            d['max_runtime'] = self.max_runtime
            d['last_retrieved_at'] = self.last_retrieved_at
            d['times_retrieved'] = self.times_retrieved

        if with_visualizations:
            d['visualizations'] = [vis.to_dict(with_query=False)
                                   for vis in self.visualizations]

        return d

    @classmethod
    def all_queries(cls):
        q = Query.select(Query, User,
                     peewee.fn.Count(QueryResult.id).alias('times_retrieved'),
                     peewee.fn.Avg(QueryResult.runtime).alias('avg_runtime'),
                     peewee.fn.Min(QueryResult.runtime).alias('min_runtime'),
                     peewee.fn.Max(QueryResult.runtime).alias('max_runtime'),
                     peewee.fn.Max(QueryResult.retrieved_at).alias('last_retrieved_at'))\
            .join(QueryResult, join_type=peewee.JOIN_LEFT_OUTER)\
            .switch(Query).join(User)\
            .group_by(Query.id, User.id)

        return q

    @classmethod
    def outdated_queries(cls):
        # TODO: this will only find scheduled queries that were executed before. I think this is
        # a reasonable assumption, but worth revisiting.
        outdated_queries_ids = cls.select(
            peewee.Func('first_value', cls.id).over(partition_by=[cls.query_hash, cls.data_source])) \
            .join(QueryResult) \
            .where(cls.ttl > 0,
                   (QueryResult.retrieved_at +
                    (cls.ttl * peewee.SQL("interval '1 second'"))) <
                   peewee.SQL("(now() at time zone 'utc')"))

        queries = cls.select(cls, DataSource).join(DataSource) \
            .where(cls.id << outdated_queries_ids)

        return queries

    @classmethod
    def update_instance(cls, query_id, **kwargs):
        if 'query' in kwargs:
            kwargs['query_hash'] = utils.gen_query_hash(kwargs['query'])

        update = cls.update(**kwargs).where(cls.id == query_id)
        return update.execute()

    def save(self, *args, **kwargs):
        self.query_hash = utils.gen_query_hash(self.query)
        self._set_api_key()
        super(Query, self).save(*args, **kwargs)

    def _set_api_key(self):
        if not self.api_key:
            self.api_key = hashlib.sha1(
                u''.join((str(time.time()), self.query, str(self._data['user']), self.name)).encode('utf-8')).hexdigest()

    def __unicode__(self):
        return unicode(self.id)


class Dashboard(BaseModel):
    id = peewee.PrimaryKeyField()
    slug = peewee.CharField(max_length=140, index=True)
    name = peewee.CharField(max_length=100)
    user_email = peewee.CharField(max_length=360, null=True)
    user = peewee.ForeignKeyField(User)
    layout = peewee.TextField()
    dashboard_filters_enabled = peewee.BooleanField(default=False)
    is_archived = peewee.BooleanField(default=False, index=True)
    created_at = peewee.DateTimeField(default=datetime.datetime.now)

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
            'widgets': widgets_layout
        }

    @classmethod
    def get_by_slug(cls, slug):
        return cls.get(cls.slug == slug)

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


class Visualization(BaseModel):
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
        }

        if with_query:
            d['query'] = self.query.to_dict()

        return d

    def __unicode__(self):
        return u"%s %s" % (self.id, self.type)


class Widget(BaseModel):
    id = peewee.PrimaryKeyField()
    visualization = peewee.ForeignKeyField(Visualization, related_name='widgets', null=True)
    text = peewee.TextField(null=True)
    width = peewee.IntegerField()
    options = peewee.TextField()
    dashboard = peewee.ForeignKeyField(Dashboard, related_name='widgets', index=True)
    created_at = peewee.DateTimeField(default=datetime.datetime.now)

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
            'text': self.text
        }

        if self.visualization and self.visualization.id:
            d['visualization'] = self.visualization.to_dict()

        return d

    def __unicode__(self):
        return u"%s" % self.id


class Event(BaseModel):
    # user, action, object_type, object_id, additional_properties
    user = peewee.ForeignKeyField(User, related_name="events")
    action = peewee.CharField()
    object_type = peewee.CharField()
    object_id = peewee.IntegerField()
    additional_properties = peewee.TextField(null=True)
    created_at = peewee.DateTimeField(default=datetime.datetime.now)

    class Meta:
        db_table = 'events'

    def __unicode__(self):
        return u"%s,%s,%s,%s" % (self._data['user'], self.action, self.object_type, self.object_id)


all_models = (DataSource, User, QueryResult, Query, Dashboard, Visualization, Widget, ActivityLog, Group, Event)


def init_db():
    Group.insert(name='admin', permissions=['admin'], tables=['*']).execute()
    Group.insert(name='default', permissions=Group.DEFAULT_PERMISSIONS, tables=['*']).execute()


def create_db(create_tables, drop_tables):
    db.connect_db()

    for model in all_models:
        if drop_tables and model.table_exists():
            # TODO: submit PR to peewee to allow passing cascade option to drop_table.
            db.database.execute_sql('DROP TABLE %s CASCADE' % model._meta.db_table)
            #model.drop_table()

        if create_tables and not model.table_exists():
            model.create_table()

    db.close_db(None)
