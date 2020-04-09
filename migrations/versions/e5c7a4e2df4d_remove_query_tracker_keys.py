"""remove_query_tracker_keys

Revision ID: e5c7a4e2df4d
Revises: 98af61feea92
Create Date: 2019-02-27 11:30:15.375318

"""
from alembic import op
import sqlalchemy as sa

from redash import redis_connection


# revision identifiers, used by Alembic.
revision = "e5c7a4e2df4d"
down_revision = "98af61feea92"
branch_labels = None
depends_on = None


DONE_LIST = "query_task_trackers:done"
WAITING_LIST = "query_task_trackers:waiting"
IN_PROGRESS_LIST = "query_task_trackers:in_progress"


def prune(list_name, keep_count, max_keys=100):
    count = redis_connection.zcard(list_name)
    if count <= keep_count:
        return 0

    remove_count = min(max_keys, count - keep_count)
    keys = redis_connection.zrange(list_name, 0, remove_count - 1)
    redis_connection.delete(*keys)
    redis_connection.zremrangebyrank(list_name, 0, remove_count - 1)
    return remove_count


def prune_all(list_name):
    removed = 1000
    while removed > 0:
        removed = prune(list_name, 0)


def upgrade():
    prune_all(DONE_LIST)
    prune_all(WAITING_LIST)
    prune_all(IN_PROGRESS_LIST)


def downgrade():
    pass
