"""add is_active column to users

Revision ID: 94450534392b
Revises: 65fc9ede4746
Create Date: 2017-02-10 14:31:53.266044

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '94450534392b'
down_revision = '65fc9ede4746'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('users', sa.Column('is_active', sa.Boolean, default=True, index=False))


def downgrade():
    op.drop_column('users', 'is_active')
