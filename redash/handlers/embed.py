import json
import logging
import time

import pystache
from authentication import current_org
from flask import current_app, render_template, request, safe_join, send_file
from flask_login import current_user, login_required
from flask_restful import abort
from funcy import project
from redash import models, serializers, settings, utils
from redash.handlers import routes
from redash.handlers.base import (get_object_or_404, org_scoped_rule,
                                  record_event)
from redash.handlers.query_results import collect_query_parameters
from redash.permissions import require_access, view_only
from redash.utils import (collect_parameters_from_request, gen_query_hash,
                          json_dumps)


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
            query_result, updated_query_ids = models.QueryResult.store_result(data_source.org, data_source,
                                                                                  query_hash, query_text, data,
                                                                                  run_time, utils.utcnow())

            models.db.session.commit()
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
    record_event(current_org, current_user, {
        'action': 'view',
        'object_id': visualization_id,
        'object_type': 'visualization',
        'query_id': query_id,
        'embed': True,
        'referer': request.headers.get('Referer')
    })

    full_path = safe_join(settings.STATIC_ASSETS_PATHS[-2], 'index.html')
    models.db.session.commit()
    return send_file(full_path, **dict(cache_timeout=0, conditional=True))


@routes.route(org_scoped_rule('/embed/query/<query_id>/json'), methods=['GET'])
@login_required
def embedjson(query_id,  org_slug=None):
    visualizations=1
    query = models.Query.get_by_id_and_org(query_id, current_org)
    require_access(query.groups, current_user, view_only)
    qr = {}

    parameter_values = collect_parameters_from_request(request.args)

    qr = query.latest_query_data
    if len(parameter_values) > 0:
            # run parameterized query
            #
            # WARNING: Note that the external query parameters
            #          are a potential risk of SQL injections.
            #
        max_age = int(request.args.get('maxAge', 0))
        results = run_query_sync(query.data_source, parameter_values, query.to_dict()['query'], max_age=max_age)

        if results is None:
            abort(400, message="Unable to get results for this query")
        else:
            qr = {"data": json.loads(results)}
    elif qr is None:
        abort(400, message="No Results for this query")
    else:
        qr = qr.to_dict()

    record_event(current_org, current_user, {
        'action': 'view',
        'query_id': query_id,
        'embed': True,
        'referer': request.headers.get('Referer')
    })

    client_config = {}
    client_config.update(settings.COMMON_CLIENT_CONFIG)
    qr = project(qr, ('data', 'id', 'retrieved_at'))
    return json_dumps(qr),200,{'Content-Type': 'application/json; charset=utf-8'}



@routes.route(org_scoped_rule('/public/dashboards/<token>'), methods=['GET'])
@login_required
def public_dashboard(token, org_slug=None):
    # TODO: bring this back.
    # record_event(current_org, current_user, {
    #     'action': 'view',
    #     'object_id': dashboard.id,
    #     'object_type': 'dashboard',
    #     'public': True,
    #     'headless': 'embed' in request.args,
    #     'referer': request.headers.get('Referer')
    # })
    # models.db.session.commit()
    full_path = safe_join(settings.STATIC_ASSETS_PATHS[-2], 'index.html')
    return send_file(full_path, **dict(cache_timeout=0, conditional=True))
