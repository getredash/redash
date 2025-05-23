"""Add dashboard-only group type and permissions

Revision ID: dashboard_only_groups
Revises: 
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from redash.models import Organization, Group


# revision identifiers, used by Alembic.
revision = 'dashboard_only_groups'
down_revision = None  # Set this to the latest migration revision
branch_labels = None
depends_on = None


def upgrade():
    # This migration doesn't need to modify the schema since we're using existing columns
    # and just adding new enum values and logic
    pass


def downgrade():
    # No schema changes to revert
    pass 