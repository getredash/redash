"""Re-index Query.search_vector with existing queries.

Revision ID: 6b5be7e0a0ef
Revises: 5ec5c84ba61e
Create Date: 2017-11-02 20:42:13.356360

"""
from alembic import op
import sqlalchemy as sa
import sqlalchemy_searchable as ss


# revision identifiers, used by Alembic.
revision = "6b5be7e0a0ef"
down_revision = "5ec5c84ba61e"
branch_labels = None
depends_on = None


def upgrade():
    ss.vectorizer.clear()

    conn = op.get_bind()

    metadata = sa.MetaData(bind=conn)
    queries = sa.Table("queries", metadata, autoload=True)

    @ss.vectorizer(queries.c.id)
    def integer_vectorizer(column):
        return sa.func.cast(column, sa.Text)

    ss.sync_trigger(
        conn,
        "queries",
        "search_vector",
        ["id", "name", "description", "query"],
        metadata=metadata,
    )


def downgrade():
    conn = op.get_bind()
    ss.drop_trigger(conn, "queries", "search_vector")
    op.drop_index("ix_queries_search_vector", table_name="queries")
    op.create_index(
        "ix_queries_search_vector",
        "queries",
        ["search_vector"],
        unique=False,
        postgresql_using="gin",
    )
    ss.sync_trigger(conn, "queries", "search_vector", ["name", "description", "query"])
