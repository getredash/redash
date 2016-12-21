"""json fields

Revision ID: 3905cabd818e
Revises: 4b86d00d91d7
Create Date: 2016-12-22 00:42:50.274064

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '3905cabd818e'
down_revision = '4b86d00d91d7'
branch_labels = None
depends_on = None


def upgrade():
    op.alter_column('organizations', 'settings', type_=postgresql.JSON, postgresql_using='settings::json')
    op.alter_column('queries', 'options', type_=postgresql.JSON, postgresql_using='options::json')
    op.alter_column('changes', 'change', type_=postgresql.JSON, postgresql_using='change::json')
    op.alter_column('alerts', 'options', type_=postgresql.JSON, postgresql_using='options::json')


def downgrade():
    op.alter_column('organizations', 'settings', type_=sa.Text)
    op.alter_column('queries', 'options', type_=sa.Text)
    op.alter_column('changes', 'change', type_=sa.Text)
    op.alter_column('alerts', 'options', type_=sa.Text)
