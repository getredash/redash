"""inline_tags

Revision ID: 0f740a081d20
Revises: a92d92aa678e
Create Date: 2018-05-10 15:47:56.120338

"""
import re
from funcy import flatten, compact
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import text
from redash import models


# revision identifiers, used by Alembic.
revision = "0f740a081d20"
down_revision = "a92d92aa678e"
branch_labels = None
depends_on = None


def upgrade():
    tags_regex = re.compile("^([\w\s]+):|#([\w-]+)", re.I | re.U)
    connection = op.get_bind()

    dashboards = connection.execute("SELECT id, name FROM dashboards")

    update_query = text("UPDATE dashboards SET tags = :tags WHERE id = :id")

    for dashboard in dashboards:
        tags = compact(flatten(tags_regex.findall(dashboard[1])))
        if tags:
            connection.execute(update_query, tags=tags, id=dashboard[0])


def downgrade():
    pass
