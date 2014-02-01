import json
import hashlib
import time
import datetime
from flask.ext.peewee.utils import slugify
import peewee
from redash import db, utils


#class User(db.Model):
#    id = db.Column(db.Integer, primary_key=True)
#    name = db.Column(db.String(320))
#    email = db.Column(db.String(160), unique=True)
#
#    def __repr__(self):
#        return '<User %r, %r>' % (self.name, self.email)


class QueryResult(db.Model):
    id = peewee.PrimaryKeyField()
    query_hash = peewee.CharField(max_length=32)
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
            'runtime': self.runtime,
            'retrieved_at': self.retrieved_at
        }

    def __unicode__(self):
        return u"%d | %s | %s" % (self.id, self.query_hash, self.retrieved_at)


class Query(db.Model):
    id = peewee.PrimaryKeyField()
    latest_query_data = peewee.ForeignKeyField(QueryResult, null=True)
    #latest_query_data_id = peewee.IntegerField()
    name = peewee.CharField(max_length=255)
    description = peewee.CharField(max_length=4096)
    query = peewee.TextField()
    query_hash = peewee.CharField(max_length=32)
    api_key = peewee.CharField(max_length=40)
    ttl = peewee.IntegerField()
    user = peewee.CharField(max_length=360)
    created_at = peewee.DateTimeField(default=datetime.datetime.now)

    class Meta:
        db_table = 'queries'

    def to_dict(self, with_result=True, with_stats=False):
        d = {
            'id': self.id,
            'latest_query_data_id': self._data['latest_query_data'],
            'name': self.name,
            'description': self.description,
            'query': self.query,
            'query_hash': self.query_hash,
            'ttl': self.ttl,
            'user': self.user,
            'api_key': self.api_key,
            'created_at': self.created_at,
        }

        if with_stats:
            d['avg_runtime'] = self.avg_runtime
            d['min_runtime'] = self.min_runtime
            d['max_runtime'] = self.max_runtime
            d['last_retrieved_at'] = self.last_retrieved_at
            d['times_retrieved'] = self.times_retrieved

        if with_result and self._data['latest_query_data']:
            d['latest_query_data'] = self.latest_query_data.to_dict()

        return d

    @classmethod
    def all_queries(cls):
        query = """SELECT queries.*, query_stats.*
FROM queries
LEFT OUTER JOIN
  (SELECT qu.query_hash,
          count(0) AS "times_retrieved",
          avg(runtime) AS "avg_runtime",
          min(runtime) AS "min_runtime",
          max(runtime) AS "max_runtime",
          max(retrieved_at) AS "last_retrieved_at"
   FROM queries qu
   JOIN query_results qr ON qu.query_hash=qr.query_hash
   GROUP BY qu.query_hash) query_stats ON query_stats.query_hash = queries.query_hash
        """
        return cls.raw(query)

    def save(self, *args, **kwargs):
        self.query_hash = utils.gen_query_hash(self.query)
        self._set_api_key()
        super(Query, self).save(*args, **kwargs)

    def _set_api_key(self):
        if not self.api_key:
            self.api_key = hashlib.sha1(
                u''.join([str(time.time()), self.query, self.user, self.name])).hexdigest()

    def __unicode__(self):
        return unicode(self.id)


class Dashboard(db.Model):
    id = peewee.PrimaryKeyField()
    slug = peewee.CharField(max_length=140, index=True)
    name = peewee.CharField(max_length=100)
    user = peewee.CharField(max_length=360)
    layout = peewee.TextField()
    is_archived = peewee.BooleanField(default=False, index=True)

    class Meta:
        db_table = 'dashboards'

    def to_dict(self, with_widgets=False):
        layout = json.loads(self.layout)

        if with_widgets:
            widgets = {w.id: w.to_dict() for w in self.widgets}
            widgets_layout = map(lambda row: map(lambda widget_id: widgets.get(widget_id, None), row), layout)
        else:
            widgets_layout = None

        return {
            'id': self.id,
            'slug': self.slug,
            'name': self.name,
            'user': self.user,
            'layout': layout,
            'widgets': widgets_layout
        }

    @classmethod
    def get_by_slug(cls, slug):
        return cls.get(cls.slug==slug)

    def save(self, *args, **kwargs):
        # TODO: make sure slug is unique
        if not self.slug:
            self.slug = slugify(self.name)
        super(Dashboard, self).save(*args, **kwargs)

    def __unicode__(self):
        return u"%s=%s" % (self.id, self.name)


class Widget(db.Model):
    id = peewee.PrimaryKeyField()
    query = peewee.ForeignKeyField(Query)
    type = peewee.CharField(max_length=100)
    width = peewee.IntegerField()
    options = peewee.TextField()
    dashboard = peewee.ForeignKeyField(Dashboard, related_name='widgets')

    class Meta:
        db_table = 'widgets'

    def to_dict(self):
        return {
            'id': self.id,
            'query': self.query.to_dict(),
            'type': self.type,
            'width': self.width,
            'options': json.loads(self.options),
            'dashboard_id': self._data['dashboard']
        }

    def __unicode__(self):
        return u"%s=>%s" % (self.id, self.dashboard_id)