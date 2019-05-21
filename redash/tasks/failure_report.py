import datetime
from collections import Counter
from flask import render_template
from redash.tasks.general import send_mail
from redash.worker import celery
from redash import redis_connection, settings
from redash.utils import json_dumps, json_loads, base_url


@celery.task(name="redash.tasks.send_aggregated_errors")
def send_aggregated_errors(email_address):
    key = 'aggregated_failures:{}'.format(email_address)
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
        subject = "Redash failed to execute {} of your queries".format(len(unique_errors.keys()))
        send_mail.delay([email_address], subject, html, text)

    redis_connection.delete(key)


def notify_of_failure(message, query):
    if not settings.SEND_EMAIL_ON_FAILED_SCHEDULED_QUERIES:
        return

    if query.schedule_failures < settings.MAX_FAILURE_REPORTS_PER_QUERY:
        key = 'aggregated_failures:{}'.format(query.user.email)
        reporting_will_soon_stop = query.schedule_failures > settings.MAX_FAILURE_REPORTS_PER_QUERY * 0.75
        comment = """This query has failed a total of {failure_count} times.
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
            send_aggregated_errors.apply_async(args=(query.user.email,), countdown=settings.SEND_FAILURE_EMAIL_INTERVAL)
            redis_connection.set('{}:pending'.format(key), 1)
            redis_connection.expire('{}:pending'.format(key), settings.SEND_FAILURE_EMAIL_INTERVAL)
