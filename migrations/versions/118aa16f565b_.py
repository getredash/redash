"""empty message

Revision ID: 118aa16f565b
Revises: cf135a57332e
Create Date: 2019-02-05 20:16:52.182780

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "118aa16f565b"
down_revision = "cf135a57332e"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "tablemetadata_queries_link",
        sa.Column("table_id", sa.Integer(), nullable=False),
        sa.Column("query_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["query_id"], ["queries.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["table_id"], ["table_metadata.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("table_id", "query_id"),
    )
    op.drop_column(u"table_metadata", "sample_query")


def downgrade():
    op.add_column(
        u"table_metadata",
        sa.Column("sample_query", sa.TEXT(), autoincrement=False, nullable=True),
    )
    op.drop_table("tablemetadata_queries_link")
