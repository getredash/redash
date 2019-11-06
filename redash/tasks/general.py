import requests

from flask_mail import Message
from rq import Connection, Queue
from rq.registry import FailedJobRegistry
from redash import mail, models, settings, rq_redis_connection
from redash.models import users
from redash.version_check import run_version_check
from redash.worker import job, get_job_logger

logger = get_job_logger(__name__)


@job('default')
def record_event(raw_event):
    event = models.Event.record(raw_event)
    models.db.session.commit()

    for hook in settings.EVENT_REPORTING_WEBHOOKS:
        logger.debug("Forwarding event to: %s", hook)
        try:
            data = {
                "schema": "iglu:io.redash.webhooks/event/jsonschema/1-0-0",
                "data": event.to_dict()
            }
            response = requests.post(hook, json=data)
            if response.status_code != 200:
                logger.error("Failed posting to %s: %s", hook, response.content)
        except Exception:
            logger.exception("Failed posting to %s", hook)


def version_check():
    run_version_check()


@job('default')
def subscribe(form):
    logger.info("Subscribing to: [security notifications=%s], [newsletter=%s]", form['security_notifications'], form['newsletter'])
    data = {
        'admin_name': form['name'],
        'admin_email': form['email'],
        'org_name': form['org_name'],
        'security_notifications': form['security_notifications'],
        'newsletter': form['newsletter']
    }
    requests.post('https://beacon.redash.io/subscribe', json=data)


@job('default')
def send_mail(to, subject, html, text):
    try:
        message = Message(recipients=to,
                          subject=subject,
                          html=html,
                          body=text)

        mail.send(message)
    except Exception:
        logger.exception('Failed sending message: %s', message.subject)


def sync_user_details():
    users.sync_last_active_at()


def purge_failed_jobs():
    jobs = rq_redis_connection.scan_iter('rq:job:*')

    is_idle = lambda key: rq_redis_connection.object('idletime', key) > settings.JOB_DEFAULT_FAILURE_TTL
    has_failed = lambda key: rq_redis_connection.hget(key, 'status') == b'failed'

    def not_in_any_failed_registry(key):
        """ This function should reject any key which is inside any FailedJobRegistry.
        However, at the moment on RQ v1.1 the @job decorator does not allow setting of a failure_ttl, so jobs 
        are kept inside the FailedJobRegistry for a year and there is no easy way tweak that.
        This has already been fixed on rq/master (https://github.com/rq/rq/pull/1130) and will be available on the 
        next release. Until then, we simply don't reject keys in a FailedJobRegistry and purge any failed jobs 
        that have been idle for over settings.JOB_DEFAULT_FAILURE_TTL.
        Once a new RQ release is available, we can delete this comment and the following line:"""
        return True # remove this line once once https://github.com/rq/rq/pull/1130 is released.

        with Connection(rq_redis_connection):
            failed_registries = [FailedJobRegistry(queue=q) for q in Queue.all()]

        job_id = lambda key : key.decode().split(':').pop()
        return all([job_id(key) not in registry for registry in failed_registries])

    stale_jobs = [key for key in jobs if is_idle(key) and has_failed(key) and not_in_any_failed_registry(key)]

    for key in stale_jobs:
        rq_redis_connection.delete(key)

    logger.info('Purged %d old failed jobs.', len(stale_jobs))