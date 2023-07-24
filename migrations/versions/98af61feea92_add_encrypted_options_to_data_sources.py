"""add_encrypted_options_to_data_sources

Revision ID: 98af61feea92
Revises: 73beceabb948
Create Date: 2019-01-31 09:21:31.517265

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy.sql import table
from sqlalchemy_utils.types.encrypted.encrypted_type import FernetEngine

from redash import settings
from redash.utils.configuration import ConfigurationContainer
from redash.models.types import (
    EncryptedConfiguration,
    Configuration,
    MutableDict,
    MutableList,
    PseudoJSON,
)

# revision identifiers, used by Alembic.
revision = "98af61feea92"
down_revision = "73beceabb948"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "data_sources",
        sa.Column("encrypted_options", postgresql.BYTEA(), nullable=True),
    )

    # copy values
    data_sources = table(
        "data_sources",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column(
            "encrypted_options",
            ConfigurationContainer.as_mutable(
                EncryptedConfiguration(
                    sa.Text, settings.DATASOURCE_SECRET_KEY, FernetEngine
                )
            ),
        ),
        sa.Column("options", ConfigurationContainer.as_mutable(Configuration)),
    )

    conn = op.get_bind()
    for ds in conn.execute(data_sources.select()):
        conn.execute(
            data_sources.update()
            .where(data_sources.c.id == ds.id)
            .values(encrypted_options=ds.options)
        )

    op.drop_column("data_sources", "options")
    op.alter_column("data_sources", "encrypted_options", nullable=False)


def downgrade():
    pass
