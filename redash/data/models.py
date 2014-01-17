"""
Django ORM based models to describe the data model of re:dash.
"""
import hashlib
import json
import time
from django.db import models
from django.template.defaultfilters import slugify
import utils


class QueryResult(models.Model):
    id = models.AutoField(primary_key=True)
    query_hash = models.CharField(max_length=32)
    query = models.TextField()
    data = models.TextField()
    runtime = models.FloatField()
    retrieved_at = models.DateTimeField()

    class Meta:
        app_label = 'redash'
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


class Query(models.Model):
    id = models.AutoField(primary_key=True)
    latest_query_data = models.ForeignKey(QueryResult)
    name = models.CharField(max_length=255)
    description = models.CharField(max_length=4096)
    query = models.TextField()
    query_hash = models.CharField(max_length=32)
    api_key = models.CharField(max_length=40)
    ttl = models.IntegerField()
    user = models.CharField(max_length=360)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = 'redash'
        db_table = 'queries'

    def create_default_visualizations(self):
        table_visualization = Visualization(query=self, name="Table",
                                            description=self.description,
                                            type="TABLE", options="{}")
        table_visualization.save()

    def to_dict(self, with_result=True, with_stats=False,
                with_visualizations=False):
        d = {
            'id': self.id,
            'latest_query_data_id': self.latest_query_data_id,
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

        if with_result and self.latest_query_data_id:
            d['latest_query_data'] = self.latest_query_data.to_dict()

        if with_visualizations:
            d['visualizations'] = [vis.to_dict(with_query=False)
                                   for vis in self.visualizations.all()]

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
        return cls.objects.raw(query)

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


class Dashboard(models.Model):
    id = models.AutoField(primary_key=True)
    slug = models.CharField(max_length=140)
    name = models.CharField(max_length=100)
    user = models.CharField(max_length=360)
    layout = models.TextField()
    is_archived = models.BooleanField(default=False)

    class Meta:
        app_label = 'redash'
        db_table = 'dashboards'

    def to_dict(self, with_widgets=False):
        layout = json.loads(self.layout)

        if with_widgets:
            widgets = {w.id: w.to_dict() for w in self.widgets.all()}
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

    def save(self, *args, **kwargs):
        # TODO: make sure slug is unique
        if not self.slug:
            self.slug = slugify(self.name)
        super(Dashboard, self).save(*args, **kwargs)

    def __unicode__(self):
        return u"%s=%s" % (self.id, self.name)


class Visualization(models.Model):
    id = models.AutoField(primary_key=True)
    type = models.CharField(max_length=100)
    query = models.ForeignKey(Query, related_name='visualizations')
    name = models.CharField(max_length=255)
    description = models.CharField(max_length=4096)
    options = models.TextField()

    class Meta:
        app_label = 'redash'
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
        return u"%s=>%s" % (self.id, self.query_id)


class Widget(models.Model):
    id = models.AutoField(primary_key=True)
    type = models.CharField(max_length=100)
    query = models.ForeignKey(Query, related_name='widgets')
    visualization = models.ForeignKey(Visualization, related_name='widgets')
    width = models.IntegerField()
    options = models.TextField()
    dashboard = models.ForeignKey(Dashboard, related_name='widgets')

    class Meta:
        app_label = 'redash'
        db_table = 'widgets'

    def to_dict(self):
        return {
            'id': self.id,
            'type': self.type,
            'width': self.width,
            'options': json.loads(self.options),
            'visualization': self.visualization.to_dict(),
            'dashboard_id': self.dashboard_id
        }

    def __unicode__(self):
        return u"%s=>%s" % (self.id, self.dashboard_id)
