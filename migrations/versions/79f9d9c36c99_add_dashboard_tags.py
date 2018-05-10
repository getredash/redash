"""add_dashboard_tags

Revision ID: 79f9d9c36c99
Revises: 1730e2ac33a4
Create Date: 2018-05-10 14:34:29.400295

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '79f9d9c36c99'
down_revision = '1730e2ac33a4'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('dashboard_tags',
    sa.Column('tag_id', sa.Integer(), nullable=False),
    sa.Column('dashboard_id', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['dashboard_id'], ['dashboards.id'], ),
    sa.ForeignKeyConstraint(['tag_id'], ['tags.id'], ),
    sa.PrimaryKeyConstraint('tag_id', 'dashboard_id')
    )


def downgrade():
    op.drop_table('dashboard_tags')
