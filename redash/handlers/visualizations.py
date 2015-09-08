import json
from flask import request

from redash import models
from redash.wsgi import api
from redash.permissions import require_permission
from redash.handlers.base import BaseResource


class VisualizationListAPI(BaseResource):
    @require_permission('edit_query')
    def post(self):
        kwargs = request.get_json(force=True)
        kwargs['options'] = json.dumps(kwargs['options'])
        kwargs['query'] = kwargs.pop('query_id')

        vis = models.Visualization(**kwargs)
        vis.save()

        return vis.to_dict(with_query=False)


class VisualizationAPI(BaseResource):
    @require_permission('edit_query')
    def post(self, visualization_id):
        kwargs = request.get_json(force=True)
        if 'options' in kwargs:
            kwargs['options'] = json.dumps(kwargs['options'])
        kwargs.pop('id', None)
        kwargs.pop('query_id', None)

        update = models.Visualization.update(**kwargs).where(models.Visualization.id == visualization_id)
        update.execute()

        vis = models.Visualization.get_by_id(visualization_id)

        return vis.to_dict(with_query=False)

    @require_permission('edit_query')
    def delete(self, visualization_id):
        vis = models.Visualization.get(models.Visualization.id == visualization_id)
        vis.delete_instance()

api.add_resource(VisualizationListAPI, '/api/visualizations', endpoint='visualizations')
api.add_resource(VisualizationAPI, '/api/visualizations/<visualization_id>', endpoint='visualization')
