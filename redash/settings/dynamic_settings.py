import os
from .helpers import int_or_none

# Replace this method with your own implementation in case you want to limit the time limit on certain queries or users.
def get_query_time_limit(is_scheduled, user_id):
    return None if is_scheduled else int_or_none(os.environ.get('REDASH_ADHOC_QUERY_TIME_LIMIT', None))