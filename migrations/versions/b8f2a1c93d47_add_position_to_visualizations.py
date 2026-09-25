"""add position to visualizations

Revision ID: b8f2a1c93d47
Revises: db0aca1ebd32
Create Date: 2026-09-05 09:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "b8f2a1c93d47"
down_revision = "db0aca1ebd32"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "visualizations",
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
    )


def downgrade():
    op.drop_column("visualizations", "position")
