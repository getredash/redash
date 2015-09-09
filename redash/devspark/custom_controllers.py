"""
Custom routes to be handled by flask
"""

import csv
import hashlib
import json
import cStringIO
import time
import logging

from flask import render_template, send_from_directory, make_response, request, jsonify, redirect, \
    session, url_for, current_app, flash
from flask.ext.restful import Resource, abort, reqparse
from flask_login import current_user, login_user, logout_user, login_required
from funcy import project
import sqlparse

from itertools import chain
from funcy import distinct

from redash import statsd_client, models, settings, utils
from redash.wsgi import app, api
from redash.tasks import QueryTask, record_event
from redash.cache import headers as cache_headers
from redash.permissions import require_permission
from redash.query_runner import query_runners, validate_configuration
from redash.monitor import get_status


# Import tasks to be able to schedule report generation in celery
import custom_tasks


@app.route('/reports/listing-per-marketing-group')
@login_required
def schedule_make_report():
    start_date = request.args.get('p_startdate')
    end_date = request.args.get('p_enddate')
    email_address = request.args.get('p_email')
    custom_tasks.generate_report.apply_async(args=[start_date, end_date, email_address])
    return ("The reports will be generated and sent to %s. "
            "Please click the back button in your browser to return." % email_address)



