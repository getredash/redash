"""Add details JSONB column to user table.

Revision ID: 527436ba4453
Revises: 71477dadd6ef
Create Date: 2018-10-23 18:44:35.622627

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '527436ba4453'
down_revision = '71477dadd6ef'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('users', sa.Column('details', postgresql.JSONB(astext_type=sa.Text()), server_default='{"active_at": null}', nullable=True))


def downgrade():
    op.drop_column('users', 'details')
