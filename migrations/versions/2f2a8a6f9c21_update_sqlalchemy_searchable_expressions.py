"""update sqlalchemy_searchable expressions

sqlalchemy-searchable 1.3 replaced the tsq_parse() SQL functions its search
queries call with parse_websearch().

Revision ID: 2f2a8a6f9c21
Revises: db0aca1ebd32
Create Date: 2026-09-27 12:00:00.000000

"""
from alembic import op
from sqlalchemy_searchable import sql_expressions


# revision identifiers, used by Alembic.
revision = '2f2a8a6f9c21'
down_revision = 'db0aca1ebd32'
branch_labels = None
depends_on = None


def upgrade():
    op.execute(sql_expressions)


def downgrade():
    pass
