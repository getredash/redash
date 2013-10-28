"""
Django ORM based models to describe the data model of re:dash.
"""
import json
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
    ttl = models.IntegerField()
    user = models.CharField(max_length=360)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = 'redash'
        db_table = 'queries'

    def to_dict(self, with_result=True):
        d = {
            'id': self.id,
            'latest_query_data_id': self.latest_query_data_id,
            'name': self.name,
            'description': self.description,
            'query': self.query,
            'query_hash': self.query_hash,
            'ttl': self.ttl,
            'user': self.user,
            'created_at': self.created_at,
        }

        if with_result and self.latest_query_data_id:
            d['latest_query_data'] = self.latest_query_data.to_dict()

        return d

    def save(self, *args, **kwargs):
        self.query_hash = utils.gen_query_hash(self.query)
        super(Query, self).save(*args, **kwargs)

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


class Widget(models.Model):
    id = models.AutoField(primary_key=True)
    query = models.ForeignKey(Query)
    type = models.CharField(max_length=100)
    width = models.IntegerField()
    options = models.TextField()
    dashboard = models.ForeignKey(Dashboard, related_name='widgets')

    class Meta:
        app_label = 'redash'
        db_table = 'widgets'

    def to_dict(self):
        return {
            'id': self.id,
            'query': self.query.to_dict(),
            'type': self.type,
            'width': self.width,
            'options': json.loads(self.options),
            'dashboard_id': self.dashboard_id
        }

    def __unicode__(self):
        return u"%s=>%s" % (self.id, self.dashboard_id)
