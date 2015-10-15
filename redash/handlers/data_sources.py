import json

from flask import make_response, request
from flask.ext.restful import abort

from redash import models
from redash.wsgi import api
from redash.permissions import require_permission
from redash.query_runner import query_runners, validate_configuration
from redash.handlers.base import BaseResource


class DataSourceTypeListAPI(BaseResource):
    @require_permission("admin")
    def get(self):
        return [q.to_dict() for q in query_runners.values()]

api.add_resource(DataSourceTypeListAPI, '/api/data_sources/types', endpoint='data_source_types')


class DataSourceAPI(BaseResource):
    @require_permission('admin')
    def get(self, data_source_id):
        data_source = models.DataSource.get_by_id(data_source_id)
        return data_source.to_dict(all=True)

    @require_permission('admin')
    def post(self, data_source_id):
        data_source = models.DataSource.get_by_id(data_source_id)
        req = request.get_json(True)

        data_source.replace_secret_placeholders(req['options'])

        if not validate_configuration(req['type'], req['options']):
            abort(400)

        data_source.name = req['name']
        data_source.options = json.dumps(req['options'])

        data_source.save()

        return data_source.to_dict(all=True)

    @require_permission('admin')
    def delete(self, data_source_id):
        data_source = models.DataSource.get_by_id(data_source_id)
        data_source.delete_instance(recursive=True)

        return make_response('', 204)


class DataSourceListAPI(BaseResource):
    def get(self):
        data_sources = [ds.to_dict() for ds in models.DataSource.all()]
        return data_sources

    @require_permission("admin")
    def post(self):
        req = request.get_json(True)
        required_fields = ('options', 'name', 'type')
        for f in required_fields:
            if f not in req:
                abort(400)

        if not validate_configuration(req['type'], req['options']):
            abort(400)

        datasource = models.DataSource.create(name=req['name'], type=req['type'], options=json.dumps(req['options']))

        return datasource.to_dict(all=True)

api.add_resource(DataSourceListAPI, '/api/data_sources', endpoint='data_sources')
api.add_resource(DataSourceAPI, '/api/data_sources/<data_source_id>', endpoint='data_source')


class DataSourceSchemaAPI(BaseResource):
    def get(self, data_source_id):
        data_source = models.DataSource.get_by_id(data_source_id)
        schema = data_source.get_schema()

        return schema

api.add_resource(DataSourceSchemaAPI, '/api/data_sources/<data_source_id>/schema')
