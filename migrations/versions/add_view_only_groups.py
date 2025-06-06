"""Add is_view_only field to groups table

Revision ID: add_view_only_groups
Revises: 9e8c841d1a30
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_view_only_groups'
down_revision = '9e8c841d1a30'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('groups', sa.Column('is_view_only', sa.Boolean(), nullable=False, server_default='false'))


def downgrade():
    op.drop_column('groups', 'is_view_only') 