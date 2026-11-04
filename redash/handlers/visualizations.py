from flask import request
from flask_restful import abort

from redash import models
from redash.handlers.base import BaseResource, get_object_or_404
from redash.permissions import (
    require_object_modify_permission,
    require_permission,
)
from redash.serializers import serialize_visualization


def next_visualization_position(query):
    """Position that puts a new visualization after the existing ones."""
    positions = [vis.position for vis in query.visualizations]
    return max(positions) + 1 if positions else 0


class VisualizationListResource(BaseResource):
    @require_permission("edit_query")
    def post(self):
        kwargs = request.get_json(force=True)

        query = get_object_or_404(models.Query.get_by_id_and_org, kwargs.pop("query_id"), self.current_org)
        require_object_modify_permission(query, self.current_user)

        kwargs["query_rel"] = query
        kwargs["position"] = next_visualization_position(query)

        vis = models.Visualization(**kwargs)
        models.db.session.add(vis)
        models.db.session.commit()
        return serialize_visualization(vis, with_query=False)


class VisualizationResource(BaseResource):
    @require_permission("edit_query")
    def post(self, visualization_id):
        vis = get_object_or_404(models.Visualization.get_by_id_and_org, visualization_id, self.current_org)
        require_object_modify_permission(vis.query_rel, self.current_user)

        kwargs = request.get_json(force=True)

        kwargs.pop("id", None)
        kwargs.pop("query_id", None)
        # Only the reorder endpoint may move a visualization, so that positions stay
        # a permutation the whole query agrees on.
        kwargs.pop("position", None)

        self.update_model(vis, kwargs)
        d = serialize_visualization(vis, with_query=False)
        models.db.session.commit()
        return d

    @require_permission("edit_query")
    def delete(self, visualization_id):
        vis = get_object_or_404(models.Visualization.get_by_id_and_org, visualization_id, self.current_org)
        require_object_modify_permission(vis.query_rel, self.current_user)
        self.record_event(
            {
                "action": "delete",
                "object_id": visualization_id,
                "object_type": "Visualization",
            }
        )
        models.db.session.delete(vis)
        models.db.session.commit()


class QueryVisualizationsReorderResource(BaseResource):
    @require_permission("edit_query")
    def post(self, query_id):
        """Reorder the visualization tabs of a query.

        Expects `{"ids": [...]}` listing every visualization of the query exactly once,
        in the order they should be displayed.
        """
        query = get_object_or_404(models.Query.get_by_id_and_org, query_id, self.current_org)
        require_object_modify_permission(query, self.current_user)

        def is_valid_id(visualization_id):
            # isinstance(visualization_id, int) alone would also accept bool, since
            # bool is a subclass of int in Python.
            return isinstance(visualization_id, int) and not isinstance(visualization_id, bool)

        payload = request.get_json(force=True)
        ids = payload.get("ids") if isinstance(payload, dict) else None
        if not isinstance(ids, list) or any(not is_valid_id(visualization_id) for visualization_id in ids):
            abort(400, message="Expected a JSON object with 'ids' set to a list of visualization ids.")

        visualizations = {vis.id: vis for vis in query.visualizations}
        if len(ids) != len(visualizations) or set(ids) != set(visualizations):
            abort(
                400,
                message="'ids' must contain every visualization of the query exactly once.",
            )

        for position, visualization_id in enumerate(ids):
            visualizations[visualization_id].position = position

        models.db.session.commit()

        self.record_event(
            {
                "action": "reorder_visualizations",
                "object_id": query_id,
                "object_type": "query",
            }
        )

        return [
            serialize_visualization(visualizations[visualization_id], with_query=False) for visualization_id in ids
        ]
