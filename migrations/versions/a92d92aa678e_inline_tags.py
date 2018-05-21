"""inline_tags

Revision ID: a92d92aa678e
Revises: a10d1ef03050
Create Date: 2018-05-10 15:41:28.053237

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'a92d92aa678e'
down_revision = 'a10d1ef03050'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('dashboards', sa.Column('tags', postgresql.ARRAY(sa.Unicode()), nullable=True))
    op.add_column('queries', sa.Column('tags', postgresql.ARRAY(sa.Unicode()), nullable=True))


def downgrade():
    op.drop_column('queries', 'tags')
    op.drop_column('dashboards', 'tags')
