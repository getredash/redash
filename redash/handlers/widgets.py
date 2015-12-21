import json

from flask import request

from redash import models
from redash.wsgi import api
from redash.permissions import require_permission
from redash.handlers.base import BaseResource


class WidgetListAPI(BaseResource):
    @require_permission('edit_dashboard')
    def post(self):
        widget_properties = request.get_json(force=True)
        widget_properties['options'] = json.dumps(widget_properties['options'])
        widget_properties.pop('id', None)
        widget_properties['dashboard'] = widget_properties.pop('dashboard_id')
        widget_properties['visualization'] = widget_properties.pop('visualization_id')
        widget = models.Widget(**widget_properties)
        widget.save()

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
        widget = models.Widget.get(models.Widget.id == widget_id)
        widget.delete_instance()

        return {'layout': widget.dashboard.layout }

api.add_resource(WidgetListAPI, '/api/widgets', endpoint='widgets')
api.add_resource(WidgetAPI, '/api/widgets/<int:widget_id>', endpoint='widget')
