"""Add description field for data_sources

Revision ID: ba150362b02e
Revises: 118aa16f565b
Create Date: 2019-02-05 21:21:08.069390

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "ba150362b02e"
down_revision = "118aa16f565b"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "data_sources", sa.Column("description", sa.String(length=4096), nullable=True)
    )


def downgrade():
    op.drop_column("data_sources", "description")
