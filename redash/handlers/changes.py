from flask import jsonify, request, url_for
from redash.handlers.base import BaseResource, paginate, get_object_or_404
from redash.models import Change, Query, Dashboard, Alert, NotificationDestination
from redash.serializers import serialize_change


class BaseChangesListResource(BaseResource):
    def _prepare_response(self, results_set):
        """
        :qparam number page_size: Number of changes to return per page
        :qparam number page: Page number to retrieve

        Responds with an array of `Change` objects.
        """

        page = request.args.get("page", 1, type=int)
        page_size = request.args.get("page_size", 25, type=int)

        # TODO: order by - ?
        # TODO: `serialize_change` may need access to nested objects - need to ensure that all are loaded at once

        response = paginate(
            results_set,
            page=page,
            page_size=page_size,
            serializer=serialize_change,
            with_stats=True,
            with_last_modified_by=False,
        )

        self.record_event({"action": "list", "object_type": "change"})

        return response

    def _get_by_object(self, fn, *args, **kwargs):
        obj = get_object_or_404(fn, *args, **kwargs)
        changes_set = Change.get_by_object(obj, self.current_org)
        return self._prepare_response(changes_set)


class ChangesListResource(BaseChangesListResource):
    def get(self):
        changes_set = Change.all_changes(self.current_org)
        return self._prepare_response(changes_set)


class QueryChangesListResource(BaseChangesListResource):
    def get(self, query_id):
        return self._get_by_object(Query.get_by_id_and_org, query_id, self.current_org)


class DashboardChangesListResource(BaseChangesListResource):
    def get(self, dashboard_id):
        return self._get_by_object(Dashboard.get_by_id_and_org, dashboard_id, self.current_org)


class AlertChangesListResource(BaseChangesListResource):
    def get(self, alert_id):
        return self._get_by_object(Alert.get_by_id_and_org, alert_id, self.current_org)


class DestinationChangesListResource(BaseChangesListResource):
    def get(self, destination_id):
        return self._get_by_object(NotificationDestination.get_by_id_and_org, destination_id, self.current_org)
