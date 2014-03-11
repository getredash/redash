import json
from redash import models
from flask.ext.script import Manager


def import_query_result(query_result):
    query_result = models.QueryResult.create(data=json.dumps(query_result['data']),
                                             query_hash=query_result['query_hash'],
                                             retrieved_at=query_result['retrieved_at'],
                                             query=query_result['query'],
                                             runtime=query_result['runtime'])

    return query_result


def import_query(user, query):
    query_result = import_query_result(query['latest_query_data'])

    new_query = models.Query.create(name=query['name'],
                                    user=user,
                                    ttl=-1,
                                    query=query['query'],
                                    query_hash=query['query_hash'],
                                    description=query['description'],
                                    latest_query_data=query_result)

    return new_query


def import_visualization(user, visualization):
    query = import_query(user, visualization['query'])

    new_visualization = models.Visualization.create(name=visualization['name'],
                                                    description=visualization['description'],
                                                    type=visualization['type'],
                                                    options=json.dumps(visualization['options']),
                                                    query=query)
    return new_visualization


def import_widget(dashboard, widget):
    visualization = import_visualization(dashboard.user, widget['visualization'])

    new_widget = models.Widget.create(dashboard=dashboard,
                                      width=widget['width'],
                                      options=json.dumps(widget['options']),
                                      visualization=visualization)

    return new_widget


def import_dashboard(user, dashboard):
    """
    Imports dashboard along with widgets, visualizations and queries from another re:dash.

    user - the user to associate all objects with.
    dashboard - dashboard to import (can be result of loading a json output).
    """

    new_dashboard = models.Dashboard.create(name=dashboard['name'],
                                            slug=dashboard['slug'],
                                            layout='[]',
                                            user=user)

    layout = []

    for widgets in dashboard['widgets']:
        row = []
        for widget in widgets:
            widget_id = import_widget(new_dashboard, widget).id
            row.append(widget_id)

        layout.append(row)

    new_dashboard.layout = json.dumps(layout)
    new_dashboard.save()

    return new_dashboard

manager = Manager(help="import/export utilities")

@manager.command
def dashboard(filename, user_id):
    user = models.User.get_by_id(user_id)
    with open(filename) as f:
        dashboard = json.loads(f.read())

        import_dashboard(user, dashboard)