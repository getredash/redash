"""add use_12_column_layout

Revision ID: dedeb4b35ab8
Revises: e5c7a4e2df4d
Create Date: 2020-04-18 18:20:00.333654

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "dedeb4b35ab8"
down_revision = "e5c7a4e2df4d"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "dashboards",
        sa.Column(
            "use_12_column_layout", sa.Boolean(), nullable=False, server_default=False
        ),
    )


def downgrade():
    op.drop_column("dashboards", "use_12_column_layout")
