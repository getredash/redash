"""add Query.schedule_failures

Revision ID: d1eae8b9893e
Revises: 65fc9ede4746
Create Date: 2017-02-03 01:45:02.954923

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "d1eae8b9893e"
down_revision = "65fc9ede4746"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "queries",
        sa.Column(
            "schedule_failures", sa.Integer(), nullable=False, server_default="0"
        ),
    )


def downgrade():
    op.drop_column("queries", "schedule_failures")
