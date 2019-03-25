"""Add sample_updated_at column to table_metadata

Revision ID: 6adb92e75691
Revises: 280daa582976
Create Date: 2019-04-10 20:13:13.714589

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "6adb92e75691"
down_revision = "280daa582976"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "table_metadata",
        sa.Column("sample_updated_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade():
    op.drop_column("table_metadata", "sample_updated_at")
