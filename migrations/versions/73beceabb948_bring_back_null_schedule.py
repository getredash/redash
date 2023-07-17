"""bring_back_null_schedule

Revision ID: 73beceabb948
Revises: e7f8a917aa8e
Create Date: 2019-01-17 13:22:21.729334

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy.sql import table

from redash.models import MutableDict, PseudoJSON

# revision identifiers, used by Alembic.
revision = "73beceabb948"
down_revision = "e7f8a917aa8e"
branch_labels = None
depends_on = None


def is_empty_schedule(schedule):
    if schedule is None:
        return False

    if schedule == {}:
        return True

    if (
        schedule.get("interval") is None
        and schedule.get("until") is None
        and schedule.get("day_of_week") is None
        and schedule.get("time") is None
    ):
        return True

    return False


def upgrade():
    op.alter_column("queries", "schedule", nullable=True, server_default=None)

    queries = table(
        "queries",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("schedule", MutableDict.as_mutable(PseudoJSON)),
    )

    conn = op.get_bind()
    for query in conn.execute(queries.select()):
        if is_empty_schedule(query.schedule):
            conn.execute(
                queries.update().where(queries.c.id == query.id).values(schedule=None)
            )


def downgrade():
    pass
