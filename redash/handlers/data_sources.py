import logging
from flask import make_response, request
from flask_restful import abort
from funcy import project

from redash import models
from redash.utils.configuration import ConfigurationContainer, ValidationError
from redash.permissions import require_admin, require_permission, require_access, view_only
from redash.query_runner import query_runners, get_configuration_schema_for_query_runner_type
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
        models.db.session.add(data_source)
        models.db.session.commit()

        return data_source.to_dict(all=True)

    @require_admin
    def delete(self, data_source_id):
        data_source = models.DataSource.get_by_id_and_org(data_source_id, self.current_org)
        models.db.session.delete(data_source)
        models.db.session.commit()

        return make_response('', 204)


class DataSourceListResource(BaseResource):
    @require_permission('list_data_sources')
    def get(self):
        if self.current_user.has_permission('admin'):
            data_sources = models.DataSource.all(self.current_org)
        else:
            data_sources = models.DataSource.all(self.current_org, group_ids=self.current_user.group_ids)

        response = {}
        for ds in data_sources:
            if ds.id in response:
                continue

            try:
                d = ds.to_dict()
                d['view_only'] = all(project(ds.groups, self.current_user.group_ids).values())
                response[ds.id] = d
            except AttributeError:
                logging.exception("Error with DataSource#to_dict (data source id: %d)", ds.id)

        return sorted(response.values(), key=lambda d: d['id'])

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

        models.db.session.commit()

        self.record_event({
            'action': 'create',
            'object_id': datasource.id,
            'object_type': 'datasource'
        })

        return datasource.to_dict(all=True)


class DataSourceSchemaResource(BaseResource):
    def get(self, data_source_id):
        data_source = get_object_or_404(models.DataSource.get_by_id_and_org, data_source_id, self.current_org)
        require_access(data_source.groups, self.current_user, view_only)
        refresh = request.args.get('refresh') is not None
        schema = data_source.get_schema(refresh)

        return schema


class DataSourcePauseResource(BaseResource):
    @require_admin
    def post(self, data_source_id):
        data_source = get_object_or_404(models.DataSource.get_by_id_and_org, data_source_id, self.current_org)
        data = request.get_json(force=True, silent=True)
        if data:
            reason = data.get('reason')
        else:
            reason = request.args.get('reason')

        data_source.pause(reason)

        self.record_event({
            'action': 'pause',
            'object_id': data_source.id,
            'object_type': 'datasource'
        })
        return data_source.to_dict()

    @require_admin
    def delete(self, data_source_id):
        data_source = get_object_or_404(models.DataSource.get_by_id_and_org, data_source_id, self.current_org)
        data_source.resume()

        self.record_event({
            'action': 'resume',
            'object_id': data_source.id,
            'object_type': 'datasource'
        })
        return data_source.to_dict()


class DataSourceTestResource(BaseResource):
    @require_admin
    def post(self, data_source_id):
        data_source = get_object_or_404(models.DataSource.get_by_id_and_org, data_source_id, self.current_org)

        try:
            data_source.query_runner.test_connection()
        except Exception as e:
            return {"message": unicode(e), "ok": False}
        else:
            return {"message": "success", "ok": True}
