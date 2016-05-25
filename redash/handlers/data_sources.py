from flask import make_response, request
from flask_restful import abort
from funcy import project

from operator import itemgetter

from redash import models
from redash.utils.configuration import ConfigurationContainer, ValidationError
from redash.permissions import require_admin, require_permission, require_access, view_only
from redash.query_runner import query_runners, get_configuration_schema_for_query_runner_type
from redash.tasks import refresh_schema
from redash.handlers.base import BaseResource, get_object_or_404


class DataSourceTypeListResource(BaseResource):
    @require_admin
    def get(self):
        return [q.to_dict() for q in sorted(query_runners.values(), key=lambda q: q.name())]


class DataSourceResource(BaseResource):
    @require_admin
    def get(self, data_source_id):
        data_source = models.DataSource.get_by_id_and_org(data_source_id, self.current_org)
        return data_source.to_dict(all=True)

    @require_admin
    def post(self, data_source_id):
        data_source = models.DataSource.get_by_id_and_org(data_source_id, self.current_org)
        req = request.get_json(True)

        schema = get_configuration_schema_for_query_runner_type(req['type'])
        if schema is None:
            abort(400)

        try:
            data_source.options.set_schema(schema)
            data_source.options.update(req['options'])
        except ValidationError:
            abort(400)
        
        data_source.type = req['type']
        data_source.name = req['name']
        data_source.save()

        return data_source.to_dict(all=True)

    @require_admin
    def delete(self, data_source_id):
        data_source = models.DataSource.get_by_id_and_org(data_source_id, self.current_org)
        data_source.delete_instance(recursive=True)

        return make_response('', 204)


class DataSourceListResource(BaseResource):
    @require_permission('list_data_sources')
    def get(self):
        if self.current_user.has_permission('admin'):
            data_sources = models.DataSource.all(self.current_org)
        else:
            data_sources = models.DataSource.all(self.current_org, groups=self.current_user.groups)

        response = {}
        for ds in data_sources:
            if ds.id in response:
                continue

            d = ds.to_dict()
            d['view_only'] = all(project(ds.groups, self.current_user.groups).values())
            response[ds.id] = d

        # Sorting by ID before returning makes it easier to set default source on front end -- ABD
        sources = sorted(response.values(), key=itemgetter('id'))

        return sources

    @require_admin
    def post(self):
        req = request.get_json(True)
        required_fields = ('options', 'name', 'type')
        for f in required_fields:
            if f not in req:
                abort(400)

        schema = get_configuration_schema_for_query_runner_type(req['type'])
        if schema is None:
            abort(400)

        config = ConfigurationContainer(req['options'], schema)
        if not config.is_valid():
            abort(400)

        datasource = models.DataSource.create_with_group(org=self.current_org,
                                                         name=req['name'],
                                                         type=req['type'],
                                                         options=config)
        self.record_event({
            'action': 'create',
            'object_id': datasource.id,
            'object_type': 'datasource'
        })

        return datasource.to_dict(all=True)


class DataSourceSchemaResource(BaseResource):
    def get(self, data_source_id):
        data_source = get_object_or_404(models.DataSource.get_by_id_and_org, data_source_id, self.current_org)
        schema = data_source.get_schema()

        return schema
        
class DataSourceTableResource(BaseResource):
    def get(self, table_id):
        data_source_table = get_object_or_404(models.DataSourceTable.get_by_id, table_id)
        return data_source_table.to_dict()
            
    def post(self, table_id):
        # We only allow manual updates of description, as rest is updated from database
        req = request.get_json(True)
        required_fields = ('description',)

        for f in required_fields:
            if f not in req:
                abort(400)
                
        data_source_table = get_object_or_404(models.DataSourceTable.get_by_id, table_id)
        
        data_source_table.description = req['description']
        data_source_table.save()

        # Refresh cache
        refresh_schema.delay(data_source_table.datasource)
        
        return data_source_table.to_dict()


class DataSourceColumnResource(BaseResource):
    def get(self, column_id):
        data_source_column = get_object_or_404(models.DataSourceColumn.get_by_id, column_id)
        return data_source_column.to_dict()
            
    def post(self, column_id):
        # We only allow manual updates of description, as rest is updated from database
        req = request.get_json(True)
        required_fields = ('description',)

        for f in required_fields:
            if f not in req:
                abort(400)

        data_source_column = get_object_or_404(models.DataSourceColumn.get_by_id, column_id)
        
        data_source_column.description = req['description']
        data_source_column.save()

        # Refresh cache
        refresh_schema.delay(data_source_column.table.datasource)

        return data_source_column.to_dict()


class DataSourceJoinListResource(BaseResource):
    def post(self):
        req = request.get_json(True)
        required_fields = ('column_id', 'related_table_id', 'related_column', 'cardinality')

        for f in required_fields:
            if f not in req:
                abort(400)

        column = get_object_or_404(models.DataSourceColumn.get_by_id, req['column_id'])
        related_column = get_object_or_404(
            models.DataSourceColumn.get,
            table=req['related_table_id'],
            name=req['related_column']
        )

        join, create = models.DataSourceJoin.get_or_create(
            table=column.table,
            column=column,
            related_table=related_column.table,
            related_column=related_column,
            cardinality=req['cardinality']
        )

        refresh_schema.delay(column.table.datasource)

        return join.to_dict(all=True)


class DataSourceJoinResource(BaseResource):
    def post(self, join_id):
        join = get_object_or_404(models.DataSourceJoin.get_by_id, join_id)

        kwargs = request.get_json(True)

        join.update_instance(**kwargs)

        return join.to_dict(all=True)

    def post(self, data_source_id):
    	
        req = request.get_json(True)
        
        if req:
            if not req.has_key('type'):
                abort(400)
        
            if req['type'] == 'column':
                data_source = get_object_or_404(models.DataSourceColumn.get_by_id, data_source_id)
            elif req['type'] == 'table':
                data_source = get_object_or_404(models.DataSourceTable.get_by_id, data_source_id)
            else:
                abort(400)
        
            if req['type'] == 'column' and req.has_key('joins'):
               data_source.joins = req['joins']
            if req.has_key('description'):
                data_source.description = req['description']
            if req.has_key('tags'):
                data_source.tags = req['tags']
               
            data_source.save()
            
            return data_source.to_dict(all=True)
        else:
            abort(400)
