import time
import logging
from flask.ext.mail import Message
import redis
from celery import Task
from celery.result import AsyncResult
from celery.utils.log import get_task_logger
from redash import redis_connection, models, statsd_client, settings, utils, mail
from redash.utils import gen_query_hash
from redash.worker import celery
from redash.query_runner import get_query_runner

logger = get_task_logger(__name__)


# Added to support custom report generation within a celery task
import os
#from mg_csv_reports import make_reports
#
#
#@celery.task
#def generate_report(start_date, end_date, email_address):
#    make_reports.get_all_reports(start_date, end_date, email_address,
#                                 os.environ.get("REPORT_QUERY"))
#
#
#
