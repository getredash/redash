"""empty message

Revision ID: dfeaacdd7624
Revises: e5c7a4e2df4d
Create Date: 2020-11-20 19:11:29.497508

"""
import json
from alembic import op
import sqlalchemy as sa

from redash.models import MutableDict, PseudoJSON

# revision identifiers, used by Alembic.
revision = 'dfeaacdd7624'
down_revision = 'e5c7a4e2df4d'
branch_labels = None
depends_on = None


def upgrade():
    # create "dashboard options" column as a dict type
    op.add_column(
        "dashboards",
        sa.Column(
            "options",
            MutableDict.as_mutable(PseudoJSON),
            nullable=False,
            server_default=json.dumps({}),
        )
    )


def downgrade():
    op.drop_column("dashboards", "options")
