"""fulltext search

Revision ID: 98761ad8c8f6
Revises: 65fc9ede4746
Create Date: 2016-12-22 15:59:24.206820

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '98761ad8c8f6'
down_revision = '65fc9ede4746'
branch_labels = None
depends_on = None


def upgrade():
    from redash.models import query_tsvector_update
    op.add_column('queries', sa.Column('tsv', postgresql.TSVECTOR(),
                                       nullable=True))
    op.create_index('query_tsv', 'queries', ['tsv'], postgres_using='gin')
    op.execute(sa.sql.text("""
        UPDATE queries SET tsv =
            setweight(to_tsvector(coalesce(name, '')), 'A') ||
            setweight(to_tsvector(coalesce(description, '')), 'B') ||
            setweight(to_tsvector(coalesce(query, '')), 'C');
        """))
    op.execute(query_tsvector_update)


def downgrade():
    op.drop_column('queries', 'tsv')
    op.execute(sa.sql.text("DROP TRIGGER query_tsvectorupdate on queries"))
    op.execute(sa.sql.text("DROP FUNCTION query_search_trigger();"))
