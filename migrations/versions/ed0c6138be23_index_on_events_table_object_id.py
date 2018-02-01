"""index on events table object_id

Revision ID: ed0c6138be23
Revises: 6b5be7e0a0ef
Create Date: 2018-02-01 15:21:47.178695

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'ed0c6138be23'
down_revision = '6b5be7e0a0ef'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("CREATE INDEX CONCURRENTLY events_object_id_idx ON events (object_id)")
    

def downgrade():
    op.execute("DROP INDEX events_object_id_idx")
