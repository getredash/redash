"""
This will eventually replace all the `to_dict` methods of the different model classes we have. This will ensure cleaner
code and better separation of concerns.
"""

import json
from funcy import project
from redash import models
from redash.handlers.query_results import run_query_sync


def public_widget(widget):

    res = {
        'id': widget.id,
        'width': widget.width,
        'options': json.loads(widget.options),
        'text': widget.text,
        'updated_at': widget.updated_at,
        'created_at': widget.created_at
    }

    if (widget.visualization and widget.visualization.id and
            widget.visualization.query_rel is not None):
        q = widget.visualization.query_rel
            # make sure the widget's query has a latest_query_data_id that is
            # not null so public dashboards work
        if (q.latest_query_data_id is None):
            run_query_sync(q.data_source, {}, q.query_text)

        query_data = q.to_dict()
        res['visualization'] = {
            'type': widget.visualization.type,
            'name': widget.visualization.name,
            'description': widget.visualization.description,
            'options': json.loads(widget.visualization.options),
            'updated_at': widget.visualization.updated_at,
            'created_at': widget.visualization.created_at,
            'query': {
                'id': q.id,
                'query': ' ',  # workaround, as otherwise the query data won't be loaded.
                'name': q.name,
                'description': q.description,
                'options': {},
                'latest_query_data': query_data
            }
        }

    return res


def public_dashboard(dashboard):
    dashboard_dict = project(dashboard.to_dict(), ('name', 'layout', 'dashboard_filters_enabled', 'updated_at', 'created_at'))

    widget_list = (models.Widget.query
                   .filter(models.Widget.dashboard_id == dashboard.id)
                   .outerjoin(models.Visualization)
                   .outerjoin(models.Query)
                   )

    widgets = {w.id: public_widget(w) for w in widget_list}

    widgets_layout = []
    for row in dashboard_dict['layout']:
        new_row = []
        for widget_id in row:
            widget = widgets.get(widget_id, None)
            if widget:
                new_row.append(widget)
        widgets_layout.append(new_row)

    dashboard_dict['widgets'] = widgets_layout
    return dashboard_dict
