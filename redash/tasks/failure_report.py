import datetime
from collections import Counter
from flask import render_template
from redash.tasks.general import send_mail
from redash.worker import celery
from redash import redis_connection, settings, models
from redash.utils import json_dumps, json_loads, base_url


@celery.task(name="redash.tasks.send_aggregated_errors")
def send_aggregated_errors(user_id):
    key = 'aggregated_failures:{}'.format(user_id)
    errors = [json_loads(e) for e in redis_connection.lrange(key, 0, -1)]

    if errors:
        errors.reverse()
        occurrences = Counter((e.get('id'), e.get('message')) for e in errors)
        unique_errors = {(e.get('id'), e.get('message')): e for e in errors}

        context = {
            'failures': [{
                    'base_url': v.get('base_url'),
                    'id': v.get('id'),
                    'name': v.get('name'),
                    'failed_at': v.get('failed_at'),
                    'failure_reason': v.get('message'),
                    'failure_count': occurrences[k],
                    'comment': v.get('comment')
            } for k, v in unique_errors.iteritems()]
        }

        html = render_template('emails/failures.html', **context)
        text = render_template('emails/failures.txt', **context)
        subject = "Redash failed to execute {} of your scheduled queries".format(len(unique_errors.keys()))
        email_address = models.User.get_by_id(user_id).email
        send_mail.delay([email_address], subject, html, text)

    redis_connection.delete(key)


def notify_of_failure(message, query):
    subscribed = query.org.get_setting('send_email_on_failed_scheduled_queries')
    exceeded_threshold = query.schedule_failures >= settings.MAX_FAILURE_REPORTS_PER_QUERY

    if subscribed and not exceeded_threshold:
        key = 'aggregated_failures:{}'.format(query.user.id)
        reporting_will_soon_stop = query.schedule_failures > settings.MAX_FAILURE_REPORTS_PER_QUERY * 0.75
        comment = """NOTICE: This query has failed a total of {failure_count} times.
                     Reporting may stop when the query exceeds {max_failure_reports} overall failures.""".format(
            failure_count=query.schedule_failures,
            max_failure_reports=settings.MAX_FAILURE_REPORTS_PER_QUERY
        ) if reporting_will_soon_stop else ''

        redis_connection.lpush(key, json_dumps({
            'id': query.id,
            'name': query.name,
            'base_url': base_url(query.org),
            'message': message,
            'comment': comment,
            'failed_at': datetime.datetime.utcnow().strftime("%B %d, %Y %I:%M%p UTC")
        }))

        if not redis_connection.exists('{}:pending'.format(key)):
            send_aggregated_errors.apply_async(args=(query.user.id,), countdown=settings.SEND_FAILURE_EMAIL_INTERVAL)
            redis_connection.set('{}:pending'.format(key), 1)
            redis_connection.expire('{}:pending'.format(key), settings.SEND_FAILURE_EMAIL_INTERVAL)
