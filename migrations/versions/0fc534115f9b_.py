"""empty message

Revision ID: 0fc534115f9b
Revises: d1eae8b9893e
Create Date: 2017-11-19 19:51:49.843065

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0fc534115f9b'
down_revision = 'd1eae8b9893e'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('dashboards', sa.Column('description', sa.String(),
                                           nullable=True, server_default=None))


def downgrade():
    op.drop_column('dashboards', 'description')
