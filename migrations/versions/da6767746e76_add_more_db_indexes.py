"""Add more db indexes.

Revision ID: da6767746e76
Revises: ba150362b02e
Create Date: 2019-12-02 11:48:52.611441

"""
from alembic import op


# revision identifiers, used by Alembic.
revision = "da6767746e76"
down_revision = "ba150362b02e"
branch_labels = None
depends_on = None


def upgrade():
    op.create_index(
        op.f("ix_column_metadata_exists"), "column_metadata", ["exists"], unique=False
    )
    op.create_index(
        op.f("ix_column_metadata_name"), "column_metadata", ["name"], unique=False
    )
    op.create_index(
        op.f("ix_column_metadata_table_id"),
        "column_metadata",
        ["table_id"],
        unique=False,
    )
    op.create_index(
        "ix_column_metadata_table_id_exists",
        "column_metadata",
        ["table_id", "exists"],
        unique=False,
    )
    op.create_index(
        "ix_column_metadata_table_id_name_exists",
        "column_metadata",
        ["table_id", "exists", "name"],
        unique=False,
    )
    op.create_index(
        "ix_column_metadata_table_id_pkey",
        "column_metadata",
        ["table_id", "id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_table_metadata_data_source_id"),
        "table_metadata",
        ["data_source_id"],
        unique=False,
    )
    op.create_index(
        "ix_table_metadata_data_source_id_exists",
        "table_metadata",
        ["data_source_id", "exists"],
        unique=False,
    )
    op.create_index(
        "ix_table_metadata_data_source_id_name_exists",
        "table_metadata",
        ["data_source_id", "exists", "name"],
        unique=False,
    )
    op.create_index(
        op.f("ix_table_metadata_exists"), "table_metadata", ["exists"], unique=False
    )
    op.create_index(
        op.f("ix_table_metadata_name"), "table_metadata", ["name"], unique=False
    )
    op.create_index(
        op.f("ix_table_metadata_sample_updated_at"),
        "table_metadata",
        ["sample_updated_at"],
        unique=False,
    )


def downgrade():
    op.drop_index(
        op.f("ix_table_metadata_sample_updated_at"), table_name="table_metadata"
    )
    op.drop_index(op.f("ix_table_metadata_name"), table_name="table_metadata")
    op.drop_index(op.f("ix_table_metadata_exists"), table_name="table_metadata")
    op.drop_index(
        "ix_table_metadata_data_source_id_name_exists", table_name="table_metadata"
    )
    op.drop_index(
        "ix_table_metadata_data_source_id_exists", table_name="table_metadata"
    )
    op.drop_index(op.f("ix_table_metadata_data_source_id"), table_name="table_metadata")
    op.drop_index("ix_column_metadata_table_id_pkey", table_name="column_metadata")
    op.drop_index(
        "ix_column_metadata_table_id_name_exists", table_name="column_metadata"
    )
    op.drop_index("ix_column_metadata_table_id_exists", table_name="column_metadata")
    op.drop_index(op.f("ix_column_metadata_table_id"), table_name="column_metadata")
    op.drop_index(op.f("ix_column_metadata_name"), table_name="column_metadata")
    op.drop_index(op.f("ix_column_metadata_exists"), table_name="column_metadata")
