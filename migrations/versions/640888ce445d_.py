"""
Add new scheduling data.

Revision ID: 640888ce445d
Revises: 71477dadd6ef
Create Date: 2018-09-21 19:35:58.578796
"""

import json
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import table
from redash.models import MutableDict


# revision identifiers, used by Alembic.
revision = "640888ce445d"
down_revision = "71477dadd6ef"
branch_labels = None
depends_on = None


def upgrade():
    # Copy "schedule" column into "old_schedule" column
    op.add_column(
        "queries", sa.Column("old_schedule", sa.String(length=10), nullable=True)
    )

    queries = table(
        "queries",
        sa.Column("schedule", sa.String(length=10)),
        sa.Column("old_schedule", sa.String(length=10)),
    )

    op.execute(queries.update().values({"old_schedule": queries.c.schedule}))

    # Recreate "schedule" column as a dict type
    op.drop_column("queries", "schedule")
    op.add_column(
        "queries",
        sa.Column(
            "schedule",
            sa.Text(),
            nullable=False,
            server_default=json.dumps({}),
        ),
    )

    # Move over values from old_schedule
    queries = table(
        "queries",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("schedule", sa.Text()),
        sa.Column("old_schedule", sa.String(length=10)),
    )

    conn = op.get_bind()
    for query in conn.execute(queries.select()):
        schedule_json = {
            "interval": None,
            "until": None,
            "day_of_week": None,
            "time": None,
        }

        if query.old_schedule is not None:
            if ":" in query.old_schedule:
                schedule_json["interval"] = 86400
                schedule_json["time"] = query.old_schedule
            else:
                schedule_json["interval"] = int(query.old_schedule)

        conn.execute(
            queries.update()
            .where(queries.c.id == query.id)
            .values(schedule=MutableDict(schedule_json))
        )

    op.drop_column("queries", "old_schedule")


def downgrade():
    op.add_column(
        "queries",
        sa.Column(
            "old_schedule",
            sa.Text(),
            nullable=False,
            server_default=json.dumps({}),
        ),
    )

    queries = table(
        "queries",
        sa.Column("schedule", sa.Text()),
        sa.Column("old_schedule", sa.Text()),
    )

    op.execute(queries.update().values({"old_schedule": queries.c.schedule}))

    op.drop_column("queries", "schedule")
    op.add_column("queries", sa.Column("schedule", sa.String(length=10), nullable=True))

    queries = table(
        "queries",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("schedule", sa.String(length=10)),
        sa.Column("old_schedule", sa.Text()),
    )

    conn = op.get_bind()
    for query in conn.execute(queries.select()):
        scheduleValue = query.old_schedule["interval"]
        if scheduleValue <= 86400:
            scheduleValue = query.old_schedule["time"]

        conn.execute(
            queries.update()
            .where(queries.c.id == query.id)
            .values(schedule=scheduleValue)
        )

    op.drop_column("queries", "old_schedule")
