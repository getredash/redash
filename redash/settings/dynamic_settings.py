import os
from .helpers import int_or_none


# Replace this method with your own implementation in case you want to limit the time limit on certain queries or users.
def query_time_limit(is_scheduled, user_id, org_id):
    scheduled_time_limit = int_or_none(
        os.environ.get("REDASH_SCHEDULED_QUERY_TIME_LIMIT", None)
    )
    adhoc_time_limit = int_or_none(
        os.environ.get("REDASH_ADHOC_QUERY_TIME_LIMIT", None)
    )

    return scheduled_time_limit if is_scheduled else adhoc_time_limit


def periodic_jobs():
    """Schedule any custom periodic jobs here. For example:

    from time import timedelta
    from somewhere import some_job, some_other_job

    return [
        {"func": some_job, "interval": timedelta(hours=1)},
        {"func": some_other_job, "interval": timedelta(days=1)}
    ]
    """
    pass


# This provides the ability to override the way we store QueryResult's data column.
# Reference implementation: redash.models.DBPersistence
QueryResultPersistence = None
