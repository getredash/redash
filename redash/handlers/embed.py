import json
import pystache
import time
import logging

from funcy import project
from flask import render_template, request
from flask_login import login_required, current_user
from flask_restful import abort

from redash import models, settings, utils
from redash import serializers
from redash.utils import json_dumps, collect_parameters_from_request, gen_query_hash
from redash.handlers import routes
from redash.handlers.base import org_scoped_rule, record_event, get_object_or_404
from redash.handlers.query_results import collect_query_parameters
from redash.permissions import require_access, view_only
from authentication import current_org

#
# Run a parameterized query synchronously and return the result
# DISCLAIMER: Temporary solution to support parameters in queries. Should be
#             removed once we refactor the query results API endpoints and handling
#             on the client side. Please don't reuse in other API handlers.
#
def run_query_sync(data_source, parameter_values, query_text, max_age=0):
    query_parameters = set(collect_query_parameters(query_text))
    missing_params = set(query_parameters) - set(parameter_values.keys())
    if missing_params:
        raise Exception('Missing parameter value for: {}'.format(", ".join(missing_params)))

    if query_parameters:
        query_text = pystache.render(query_text, parameter_values)

    if max_age <= 0:
        query_result = None
    else:
        query_result = models.QueryResult.get_latest(data_source, query_text, max_age)

    query_hash = gen_query_hash(query_text)

    if query_result:
        logging.info("Returning cached result for query %s" % query_hash)
        return query_result.data

    try:
        started_at = time.time()
        data, error = data_source.query_runner.run_query(query_text, current_user)

        if error:
            return None
        # update cache
        if max_age > 0:
            run_time = time.time() - started_at
            query_result, updated_query_ids = models.QueryResult.store_result(data_source.org_id, data_source.id,
                                                                                  query_hash, query_text, data,
                                                                                  run_time, utils.utcnow())

        return data
    except Exception, e:
        if max_age > 0:
            abort(404, message="Unable to get result from the database, and no cached query result found.")
        else:
            abort(503, message="Unable to get result from the database.")
        return None


@routes.route(org_scoped_rule('/embed/query/<query_id>/visualization/<visualization_id>'), methods=['GET'])
@login_required
def embed(query_id, visualization_id, org_slug=None):
    query = models.Query.get_by_id_and_org(query_id, current_org)
    require_access(query.groups, current_user, view_only)
    vis = query.visualizations.where(models.Visualization.id == visualization_id).first()
    qr = {}

    parameter_values = collect_parameters_from_request(request.args)

    if vis is not None:
        vis = vis.to_dict()
        qr = query.latest_query_data
        if settings.ALLOW_PARAMETERS_IN_EMBEDS == True and len(parameter_values) > 0:
            # run parameterized query
            #
            # WARNING: Note that the external query parameters
            #          are a potential risk of SQL injections.
            #
            max_age = int(request.args.get('maxAge', 0))
            results = run_query_sync(query.data_source, parameter_values, query.query, max_age=max_age)
            if results is None:
                abort(400, message="Unable to get results for this query")
            else:
                qr = {"data": json.loads(results)}
        elif qr is None:
            abort(400, message="No Results for this query")
        else:
            qr = qr.to_dict()
    else:
        abort(404, message="Visualization not found.")

    record_event(current_org, current_user, {
        'action': 'view',
        'object_id': visualization_id,
        'object_type': 'visualization',
        'query_id': query_id,
        'embed': True,
        'referer': request.headers.get('Referer')
    })

    client_config = {}
    client_config.update(settings.COMMON_CLIENT_CONFIG)

    qr = project(qr, ('data', 'id', 'retrieved_at'))
    vis = project(vis, ('description', 'name', 'id', 'options', 'query', 'type', 'updated_at'))
    vis['query'] = project(vis['query'], ('created_at', 'description', 'name', 'id', 'latest_query_data_id', 'name', 'updated_at'))

    return render_template("embed.html",
                           client_config=json_dumps(client_config),
                           visualization=json_dumps(vis),
                           query_result=json_dumps(qr))



@routes.route(org_scoped_rule('/public/dashboards/<token>'), methods=['GET'])
@login_required
def public_dashboard(token, org_slug=None):
    # TODO: verify object is a dashboard?
    if not isinstance(current_user, models.ApiUser):
        api_key = get_object_or_404(models.ApiKey.get_by_api_key, token)
        dashboard = api_key.object
    else:
        dashboard = current_user.object

    user = {
        'permissions': [],
        'apiKey': current_user.id
    }

    headers = {
        'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate'
    }

    record_event(current_org, current_user, {
        'action': 'view',
        'object_id': dashboard.id,
        'object_type': 'dashboard',
        'public': True,
        'headless': 'embed' in request.args,
        'referer': request.headers.get('Referer')
    })

    response = render_template("public.html",
                               headless='embed' in request.args,
                               user=json.dumps(user),
                               seed_data=json_dumps({
                                 'dashboard': serializers.public_dashboard(dashboard)
                               }),
                               client_config=json.dumps(settings.COMMON_CLIENT_CONFIG))

    return response, 200, headers
