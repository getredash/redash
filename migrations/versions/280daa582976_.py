"""Add column metadata and table metadata

Revision ID: 280daa582976
Revises: 151a4c333e96
Create Date: 2019-01-24 18:23:53.040608

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "280daa582976"
down_revision = "151a4c333e96"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "table_metadata",
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("org_id", sa.Integer(), nullable=False),
        sa.Column("data_source_id", sa.Integer(), nullable=False),
        sa.Column("exists", sa.Boolean(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.String(length=4096), nullable=True),
        sa.Column("column_metadata", sa.Boolean(), nullable=False),
        sa.Column("sample_query", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(
            ["data_source_id"], ["data_sources.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "column_metadata",
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("org_id", sa.Integer(), nullable=False),
        sa.Column("table_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("type", sa.String(length=255), nullable=True),
        sa.Column("example", sa.String(length=4096), nullable=True),
        sa.Column("exists", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(
            ["table_id"], ["table_metadata.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade():
    op.drop_table("column_metadata")
    op.drop_table("table_metadata")
