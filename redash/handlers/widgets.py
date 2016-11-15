import json

from flask import request

from redash import models
from redash.permissions import require_permission, require_admin_or_owner, require_access, view_only
from redash.handlers.base import BaseResource


class WidgetListResource(BaseResource):
    @require_permission('edit_dashboard')
    def post(self):
        widget_properties = request.get_json(force=True)
        dashboard = models.Dashboard.get_by_id_and_org(widget_properties.pop('dashboard_id'), self.current_org)
        require_admin_or_owner(dashboard.user_id)

        widget_properties['options'] = json.dumps(widget_properties['options'])
        widget_properties.pop('id', None)
        widget_properties['dashboard'] = dashboard

        visualization_id = widget_properties.pop('visualization_id')
        if visualization_id:
            visualization = models.Visualization.get_by_id_and_org(visualization_id, self.current_org)
            require_access(visualization.query.groups, self.current_user, view_only)
        else:
            visualization = None

        widget_properties['visualization'] = visualization

        widget = models.Widget.create(**widget_properties)

        layout = json.loads(widget.dashboard.layout)
        new_row = True

        if len(layout) == 0 or widget.width == 2:
            layout.append([widget.id])
        elif len(layout[-1]) == 1:
            neighbour_widget = models.Widget.get(models.Widget.id == layout[-1][0])
            if neighbour_widget.width == 1:
                layout[-1].append(widget.id)
                new_row = False
            else:
                layout.append([widget.id])
        else:
            layout.append([widget.id])

        widget.dashboard.layout = json.dumps(layout)
        widget.dashboard.save()

        return {'widget': widget.to_dict(), 'layout': layout, 'new_row': new_row, 'version': dashboard.version}


class WidgetResource(BaseResource):
    @require_permission('edit_dashboard')
    def post(self, widget_id):
        # This method currently handles Text Box widgets only.
        widget = models.Widget.get_by_id_and_org(widget_id, self.current_org)
        require_admin_or_owner(widget.dashboard.user_id)
        widget_properties = request.get_json(force=True)
        widget.text = widget_properties['text']
        widget.save()

        return widget.to_dict()

    @require_permission('edit_dashboard')
    def delete(self, widget_id):
        widget = models.Widget.get_by_id_and_org(widget_id, self.current_org)
        require_admin_or_owner(widget.dashboard.user_id)
        widget.delete_instance()

        return {'layout': widget.dashboard.layout}
