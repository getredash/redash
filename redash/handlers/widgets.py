import json

from flask import request

from redash import models
from redash.wsgi import api
from redash.permissions import require_permission, require_admin_or_owner
from redash.handlers.base import BaseResource


class WidgetListAPI(BaseResource):
    @require_permission('edit_dashboard')
    def post(self):
        widget_properties = request.get_json(force=True)
        dashboard = models.Dashboard.get_by_id_and_org(widget_properties.pop('dashboard_id'), self.current_org)
        require_admin_or_owner(dashboard.user_id)

        widget_properties['options'] = json.dumps(widget_properties['options'])
        widget_properties.pop('id', None)
        widget_properties['dashboard'] = dashboard
        widget_properties['visualization'] = widget_properties.pop('visualization_id')
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

        return {'widget': widget.to_dict(), 'layout': layout, 'new_row': new_row}


class WidgetAPI(BaseResource):
    @require_permission('edit_dashboard')
    def delete(self, widget_id):
        widget = models.Widget.get_by_id_and_org(widget_id, self.current_org)
        require_admin_or_owner(widget.dashboard.user_id)
        widget.delete_instance()

        return {'layout': widget.dashboard.layout}

api.add_org_resource(WidgetListAPI, '/api/widgets', endpoint='widgets')
api.add_org_resource(WidgetAPI, '/api/widgets/<int:widget_id>', endpoint='widget')
