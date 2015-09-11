"""
Custom routes to be handled by flask
"""

import logging

from flask import request
from flask_login import login_required
from redash.wsgi import app

# Import tasks to be able to schedule report generation in celery
from redash.devspark.custom_tasks import report_tasks


@app.route('/reports/listing-per-marketing-group')
@login_required
def schedule_make_report():
    start_date = request.args.get('p_startdate')
    end_date = request.args.get('p_enddate')
    email_address = request.args.get('p_email')
    report_tasks.generate_report.apply_async(
        args=[start_date, end_date, email_address])
    logging.info("Report sent to %s" % email_address)
    return ("The reports will be generated and sent to %s. "
            "Please click the back button in your browser to return."
            % email_address)
