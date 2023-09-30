"""create sqlalchemy_searchable expressions

Revision ID: 7ce5925f832b
Revises: 1038c2174f5d
Create Date: 2023-09-29 16:48:29.517762

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy_searchable import sql_expressions


# revision identifiers, used by Alembic.
revision = '7ce5925f832b'
down_revision = '1038c2174f5d'
branch_labels = None
depends_on = None


def upgrade():
    op.execute(sql_expressions)


def downgrade():
    pass
