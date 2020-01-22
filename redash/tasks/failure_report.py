import logging
import datetime
import re
from collections import Counter
from redash.tasks.general import send_mail
from redash import redis_connection, settings, models
from redash.utils import json_dumps, json_loads, base_url, render_template


def key(user_id):
    return "aggregated_failures:{}".format(user_id)


def comment_for(failure):
    schedule_failures = failure.get("schedule_failures")
    if schedule_failures > settings.MAX_FAILURE_REPORTS_PER_QUERY * 0.75:
        return """NOTICE: This query has failed a total of {schedule_failures} times.
        Reporting may stop when the query exceeds {max_failure_reports} overall failures.""".format(
            schedule_failures=schedule_failures,
            max_failure_reports=settings.MAX_FAILURE_REPORTS_PER_QUERY,
        )


def send_aggregated_errors():
    for k in redis_connection.scan_iter(key("*")):
        user_id = re.search(r"\d+", k).group()
        send_failure_report(user_id)


def send_failure_report(user_id):
    user = models.User.get_by_id(user_id)
    errors = [json_loads(e) for e in redis_connection.lrange(key(user_id), 0, -1)]

    if errors:
        errors.reverse()
        occurrences = Counter((e.get("id"), e.get("message")) for e in errors)
        unique_errors = {(e.get("id"), e.get("message")): e for e in errors}

        context = {
            "failures": [
                {
                    "id": v.get("id"),
                    "name": v.get("name"),
                    "failed_at": v.get("failed_at"),
                    "failure_reason": v.get("message"),
                    "failure_count": occurrences[k],
                    "comment": comment_for(v),
                }
                for k, v in unique_errors.items()
            ],
            "base_url": base_url(user.org),
        }

        subject = "Redash failed to execute {} of your scheduled queries".format(
            len(unique_errors.keys())
        )
        html, text = [
            render_template("emails/failures.{}".format(f), context)
            for f in ["html", "txt"]
        ]

        send_mail.delay([user.email], subject, html, text)

    redis_connection.delete(key(user_id))


def notify_of_failure(message, query):
    subscribed = query.org.get_setting("send_email_on_failed_scheduled_queries")
    exceeded_threshold = (
        query.schedule_failures >= settings.MAX_FAILURE_REPORTS_PER_QUERY
    )

    if subscribed and not query.user.is_disabled and not exceeded_threshold:
        redis_connection.lpush(
            key(query.user.id),
            json_dumps(
                {
                    "id": query.id,
                    "name": query.name,
                    "message": message,
                    "schedule_failures": query.schedule_failures,
                    "failed_at": datetime.datetime.utcnow().strftime(
                        "%B %d, %Y %I:%M%p UTC"
                    ),
                }
            ),
        )


def track_failure(query, error):
    logging.debug(error)

    query.schedule_failures += 1
    query.skip_updated_at = True
    models.db.session.add(query)
    models.db.session.commit()

    notify_of_failure(error, query)
