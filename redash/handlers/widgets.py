import json

from flask import request
from redash import models
from redash.handlers.base import BaseResource
from redash.permissions import (require_access,
                                require_object_modify_permission,
                                require_permission, view_only)


class WidgetListResource(BaseResource):
    @require_permission('edit_dashboard')
    def post(self):
        """
        Add a widget to a dashboard.

        :<json number dashboard_id: The ID for the dashboard being added to
        :<json visualization_id: The ID of the visualization to put in this widget
        :<json object options: Widget options
        :<json string text: Text box contents
        :<json number width: Width for widget display

        :>json object widget: The created widget
        """
        widget_properties = request.get_json(force=True)
        dashboard = models.Dashboard.get_by_id_and_org(widget_properties.pop('dashboard_id'), self.current_org)
        require_object_modify_permission(dashboard, self.current_user)

        widget_properties['options'] = json.dumps(widget_properties['options'])
        widget_properties.pop('id', None)
        widget_properties['dashboard'] = dashboard

        visualization_id = widget_properties.pop('visualization_id')
        if visualization_id:
            visualization = models.Visualization.get_by_id_and_org(visualization_id, self.current_org)
            require_access(visualization.query_rel.groups, self.current_user, view_only)
        else:
            visualization = None

        widget_properties['visualization'] = visualization

        widget = models.Widget(**widget_properties)
        models.db.session.add(widget)
        models.db.session.commit()

        models.db.session.commit()
        return {'widget': widget.to_dict()}


class WidgetResource(BaseResource):
    @require_permission('edit_dashboard')
    def post(self, widget_id):
        """
        Updates a widget in a dashboard.
        This method currently handles Text Box widgets only.

        :param number widget_id: The ID of the widget to modify

        :<json string text: The new contents of the text box
        """
        widget = models.Widget.get_by_id_and_org(widget_id, self.current_org)
        require_object_modify_permission(widget.dashboard, self.current_user)
        widget_properties = request.get_json(force=True)
        widget.text = widget_properties['text']
        widget.options = json.dumps(widget_properties['options'])
        models.db.session.commit()
        return widget.to_dict()

    @require_permission('edit_dashboard')
    def delete(self, widget_id):
        """
        Remove a widget from a dashboard.

        :param number widget_id: ID of widget to remove
        """
        widget = models.Widget.get_by_id_and_org(widget_id, self.current_org)
        require_object_modify_permission(widget.dashboard, self.current_user)
        models.db.session.delete(widget)
        models.db.session.commit()
