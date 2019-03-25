"""Add column description and table visibility fields

Revision ID: cf135a57332e
Revises: 6adb92e75691
Create Date: 2019-02-05 19:52:48.233070

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "cf135a57332e"
down_revision = "6adb92e75691"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "column_metadata",
        sa.Column("description", sa.String(length=4096), nullable=True),
    )
    op.add_column(
        "table_metadata",
        sa.Column("visible", sa.Boolean(), nullable=False, server_default="True"),
    )


def downgrade():
    op.drop_column("table_metadata", "visible")
    op.drop_column("column_metadata", "description")
