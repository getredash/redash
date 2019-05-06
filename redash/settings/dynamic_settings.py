import os
from .helpers import int_or_none


# Replace this method with your own implementation in case you want to limit the time limit on certain queries or users.
def query_time_limit(is_scheduled, user_id, org_id):
    scheduled_time_limit = int_or_none(os.environ.get('REDASH_SCHEDULED_QUERY_TIME_LIMIT', None))
    adhoc_time_limit = int_or_none(os.environ.get('REDASH_ADHOC_QUERY_TIME_LIMIT', None))

    return scheduled_time_limit if is_scheduled else adhoc_time_limit
