from flask import request, Response, render_template
# from flask_login import login_required
# from flask.ext.login import current_user
import json
from bson import json_util
from redash.wsgi import app
from redash import models
from flask import send_file
import tempfile
from redash.devspark import dashboard_import


@app.route('/__admin/dashboard/export')
def export_form():
    """
    """
    dashboards = models.Dashboard.select().dicts()

    return render_template(
        "export_form.html",
        dashboards=[{'id': d['id'], 'name': d['name']} for d in dashboards],
    )


@app.route('/__admin/dashboard/import')
def import_form():
    """
    """
    return render_template("views/import_form.html")


# Add or delete a dashboard from favourites. True = Add . False = Remove
@app.route('/__admin/dashboard/_export/<dashboard_id>', methods=['GET'])
def do_export(dashboard_id):
    """
    """
    # TODO: This could be further refined to accept multiple dashboards IDs
    dashboards = [models.Dashboard.select().dicts().where(
        models.Dashboard.id == dashboard_id).get()]

    widgets = [w for w in models.Widget.select().dicts().where(
        models.Widget.dashboard == dashboard_id)]

    visualizations = [v for v in models.Visualization.select().dicts().where(
        models.Visualization.id << [w['visualization'] for w in widgets])]

    queries = [q for q in models.Query.select().dicts().where(
        models.Query.id << [v['query'] for v in visualizations])]

    # This code is left out commented so that it can be used in the future if
    # debugging is required.

#    return Response(
#        response=json.dumps({
#            'dashboard': dashboard,
#            'widgets': widgets,
#            'visualizations': visualizations,
#            'queries': queries
#        }, default=json_util.default),
#        status=200,
#        mimetype="application/json",
#        headers="
#    )

    with tempfile.NamedTemporaryFile() as t_flo:
        t_flo.write(json.dumps({
            'dashboards': dashboards,
            'widgets': widgets,
            'visualizations': visualizations,
            'queries': queries}, default=json_util.default))
        t_flo.flush()

        return send_file(
            t_flo.name,
            attachment_filename="dashboard_%s.json" % dashboard_id,
            mimetype='application/text'
        )


@app.route('/__admin/dashboard/do_import', methods=['POST'])
def do_import():
    """
    """
    res = dashboard_import.import_dashboard(
        request.json['data'],
        request.json['actions']
    )

    return Response(
        response=res,
        status=200
    )


def db_get(db, id):
    """
    """
    try:
        a = next(x for x in db if x.id == id)
        return a.to_dict()
    except StopIteration:
        return None

def data_get(data, id):
    """
    """
    return next(x for x in data if x['id'] == id)

def db_matches(new_data, db_data):
    """
    """

    if not db_data:
        return False

    if not all(new_data[i] == db_data[i] for i in new_data):
        app.logger.error('new:')
        app.logger.error(new_data)
        app.logger.error('existing:')
        app.logger.error(db_data)

    return all(new_data[i] == db_data[i] for i in new_data)


@app.route('/__admin/dashboard/get_item_status', methods=['POST'])
def get_item_status():
    """
    """
    data = request.json

    _m = {
        'dashboards': models.Dashboard,
        'widgets': models.Widget,
        'queries': models.Query,
        'visualizations': models.Visualization
    }

    # Get database items
    db = {
        d: _m[d].select().where(_m[d].id << [x['id'] for x in data[d]]).execute()
        for d in data
    }

    db_status = {
        d: {
            i['id']: {
                'exists': bool(db_get(db[d], i['id'])),
                'matches': db_matches(i, db_get(db[d], i['id']))
            } for i in data[d]
        } for d in data
    }

    return Response(
        response=json.dumps(db_status, default=json_util.default),
        status=200,
        mimetype="application/json",
    )


