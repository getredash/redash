"""clear_changes_table

Revision ID: 4952e040e9dd
Revises: e5c7a4e2df4d
Create Date: 2020-04-06 13:22:15.256635

"""
from alembic import op


# revision identifiers, used by Alembic.
revision = '4952e040e9dd'
down_revision = 'e5c7a4e2df4d'
branch_labels = None
depends_on = None


def upgrade():
    connection = op.get_bind()
    connection.execute("DELETE FROM changes")


def downgrade():
    pass
