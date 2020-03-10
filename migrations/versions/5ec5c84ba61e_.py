"""Add Query.search_vector field for full text search.

Revision ID: 5ec5c84ba61e
Revises: 7671dca4e604
Create Date: 2017-10-17 18:21:00.174015

"""
from alembic import op
import sqlalchemy as sa
import sqlalchemy_utils as su
import sqlalchemy_searchable as ss


# revision identifiers, used by Alembic.
revision = "5ec5c84ba61e"
down_revision = "7671dca4e604"
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    op.add_column("queries", sa.Column("search_vector", su.TSVectorType()))
    op.create_index(
        "ix_queries_search_vector",
        "queries",
        ["search_vector"],
        unique=False,
        postgresql_using="gin",
    )
    ss.sync_trigger(conn, "queries", "search_vector", ["name", "description", "query"])


def downgrade():
    conn = op.get_bind()

    ss.drop_trigger(conn, "queries", "search_vector")
    op.drop_index("ix_queries_search_vector", table_name="queries")
    op.drop_column("queries", "search_vector")
