import json
import hashlib
import time
import datetime
from flask.ext.peewee.utils import slugify
from flask.ext.login import UserMixin, AnonymousUserMixin
from passlib.apps import custom_app_context as pwd_context
import peewee
from playhouse.postgres_ext import ArrayField
from redash import db, utils


class BaseModel(db.Model):
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
    id = peewee.PrimaryKeyField()
    name = peewee.CharField(max_length=320)
    email = peewee.CharField(max_length=320, index=True, unique=True)
    password_hash = peewee.CharField(max_length=128, null=True)
    is_admin = peewee.BooleanField(default=False)
    groups = ArrayField(peewee.CharField, default=['default'])

    class Meta:
        db_table = 'users'

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'is_admin': self.is_admin
        }

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

        query = cls.select().where(cls.query_hash == query_hash, cls.data_source == data_source,
                                   peewee.SQL("retrieved_at + interval '%s second' >= now() at time zone 'utc'", ttl)).order_by(cls.retrieved_at.desc())

        return query.first()

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

    def to_dict(self, with_result=True, with_stats=False, with_visualizations=False, with_user=True):
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

        if with_result and self.latest_query_data:
            d['latest_query_data'] = self.latest_query_data.to_dict()

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
    is_archived = peewee.BooleanField(default=False, index=True)
    created_at = peewee.DateTimeField(default=datetime.datetime.now)

    class Meta:
        db_table = 'dashboards'

    def to_dict(self, with_widgets=False):
        layout = json.loads(self.layout)

        if with_widgets:
            widgets = Widget.select(Widget, Visualization, Query, QueryResult, User)\
                .where(Widget.dashboard == self.id)\
                .join(Visualization)\
                .join(Query)\
                .join(User)\
                .switch(Query)\
                .join(QueryResult)
            widgets = {w.id: w.to_dict() for w in widgets}
            widgets_layout = map(lambda row: map(lambda widget_id: widgets.get(widget_id, None), row), layout)
        else:
            widgets_layout = None

        return {
            'id': self.id,
            'slug': self.slug,
            'name': self.name,
            'user_id': self._data['user'],
            'layout': layout,
            'widgets': widgets_layout
        }

    @classmethod
    def get_by_slug(cls, slug):
        return cls.get(cls.slug == slug)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)

            tries = 1
            while self.select().where(Dashboard.slug == self.slug).first() is not None:
                self.slug = slugify(self.name) + "_{0}".format(tries)
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
    visualization = peewee.ForeignKeyField(Visualization, related_name='widgets')

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
        return {
            'id': self.id,
            'width': self.width,
            'options': json.loads(self.options),
            'visualization': self.visualization.to_dict(),
            'dashboard_id': self._data['dashboard']
        }

    def __unicode__(self):
        return u"%s" % self.id

all_models = (DataSource, User, QueryResult, Query, Dashboard, Visualization, Widget, ActivityLog, Group)


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