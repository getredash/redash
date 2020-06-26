"""add columns for disabled users

Revision ID: 1daa601d3ae5
Revises: 969126bd800f
Create Date: 2018-03-07 10:20:10.410159

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "1daa601d3ae5"
down_revision = "969126bd800f"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("disabled_at", sa.DateTime(True), nullable=True))


def downgrade():
    op.drop_column("users", "disabled_at")
