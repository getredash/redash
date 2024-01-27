"""inline_tags

Revision ID: a92d92aa678e
Revises: e7004224f284
Create Date: 2018-05-10 15:41:28.053237

"""
import re
from funcy import flatten, compact
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ARRAY
from redash import models

# revision identifiers, used by Alembic.
revision = "a92d92aa678e"
down_revision = "e7004224f284"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "dashboards", sa.Column("tags", ARRAY(sa.Unicode()), nullable=True)
    )
    op.add_column(
        "queries", sa.Column("tags", ARRAY(sa.Unicode()), nullable=True)
    )


def downgrade():
    op.drop_column("queries", "tags")
    op.drop_column("dashboards", "tags")
