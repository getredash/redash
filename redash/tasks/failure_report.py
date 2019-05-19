import datetime
from collections import Counter
from redash.tasks.general import send_mail
from redash.worker import celery
from redash import redis_connection, settings
from redash.utils import json_dumps, json_loads

def base_url(org):
    if settings.MULTI_ORG:
        return "https://{}/{}".format(settings.HOST, org.slug)

    return settings.HOST

@celery.task(name="redash.tasks.send_aggregated_errors")
def send_aggregated_errors(email_address):
    key = 'aggregated_failures:{}'.format(email_address)
    errors = [json_loads(e) for e in redis_connection.lrange(key, 0, -1)]
    errors.reverse()
    occurrences = Counter((e.get('id'), e.get('message')) for e in errors)
    unique_errors = {(e.get('id'), e.get('message')): e for e in errors}

    html = '<hr>'.join(["""
            <p>
              <h3><a href="{base_url}/queries/{id}">{name}</a></h3>
              Last failed at: {failed_at} (failed {failure_count} times since last report)<br>
              Error message: <pre style="border: 1px solid black; padding: 10px; background: #fbfbfb">{failure_reason}</pre>
              <b>{comment}</b>
            </p>""".format(
                base_url=v.get('base_url'),
                id=v.get('id'),
                name=v.get('name'),
                failed_at=v.get('failed_at'),
                failure_reason=v.get('message'),
                failure_count=occurrences[k],
                comment=v.get('comment')) for k, v in unique_errors.iteritems()])

    send_mail.delay([email_address], "Failed Scheduled Query Executions", html, None)

    redis_connection.delete(key)

def notify_of_failure(message, query):
    if not settings.SEND_EMAIL_ON_FAILED_SCHEDULED_QUERIES:
        return

    if query.schedule_failures < settings.MAX_FAILURE_REPORTS_PER_QUERY:
        key = 'aggregated_failures:{}'.format(query.user.email)
        reporting_will_soon_stop = query.schedule_failures > settings.MAX_FAILURE_REPORTS_PER_QUERY * 0.75
        comment = 'This query has failed a total of {failure_count} times. Reporting may stop when the query exceeds {max_failure_reports} overall failures.'.format(
            failure_count=query.schedule_failures,
            max_failure_reports=settings.MAX_FAILURE_REPORTS_PER_QUERY
        ) if reporting_will_soon_stop else ''

        redis_connection.lpush(key, json_dumps({
            'id': query.id,
            'name': query.name,
            'base_url': base_url(query.org),
            'message': message,
            'comment': comment,
            'failed_at': datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
        }))

        if not redis_connection.exists('{}:pending'.format(key)):
            send_aggregated_errors.apply_async(args=(query.user.email,), countdown=settings.SEND_FAILURE_EMAIL_INTERVAL)
            redis_connection.set('{}:pending'.format(key), 1)
            redis_connection.expire('{}:pending'.format(key), settings.SEND_FAILURE_EMAIL_INTERVAL)