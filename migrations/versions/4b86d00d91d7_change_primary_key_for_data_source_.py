"""change primary key for data_source_groups

Revision ID: 4b86d00d91d7
Revises: 30230b51ac73
Create Date: 2016-12-14 12:12:59.716520

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '4b86d00d91d7'
down_revision = '30230b51ac73'
branch_labels = None
depends_on = None


def upgrade():
    op.drop_constraint('data_source_groups_pkey', 'data_source_groups')
    op.create_primary_key('data_source_groups_pkey', 'data_source_groups',
                          ['data_source_id', 'group_id'])
    op.drop_column('data_source_groups', 'id')


def downgrade():
    op.drop_constraint('data_source_groups_pkey', 'data_source_groups')
    op.add_column('data_source_groups', sa.Column('id', sa.INTEGER(),
                                                  nullable=False))
    op.create_primary_key('data_source_groups_pkey', 'data_source_groups',
                          ['id'])
