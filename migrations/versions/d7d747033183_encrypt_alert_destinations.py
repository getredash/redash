"""encrypt alert destinations

Revision ID: d7d747033183
Revises: e5c7a4e2df4d
Create Date: 2020-12-14 21:42:48.661684

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import BYTEA
from sqlalchemy.sql import table
from sqlalchemy_utils.types.encrypted.encrypted_type import FernetEngine

from redash import settings
from redash.utils.configuration import ConfigurationContainer
from redash.models.base import key_type
from redash.models.types import EncryptedConfiguration


# revision identifiers, used by Alembic.
revision = 'd7d747033183'
down_revision = 'e5c7a4e2df4d'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "notification_destinations",
        sa.Column("encrypted_options", BYTEA(), nullable=True)
    )

    # copy values
    notification_destinations = table(
        "notification_destinations",
        sa.Column("id", key_type("NotificationDestination"), primary_key=True),
        sa.Column(
            "encrypted_options",
            ConfigurationContainer.as_mutable(
                EncryptedConfiguration(
                    sa.Text, settings.DATASOURCE_SECRET_KEY, FernetEngine
                )
            ),
        ),
        sa.Column(
            "options", 
            ConfigurationContainer.as_mutable(
                EncryptedConfiguration(
                    sa.Text, settings.DATASOURCE_SECRET_KEY, FernetEngine
                )
            ),
        ),
    )

    conn = op.get_bind()
    for dest in conn.execute(notification_destinations.select()):
        conn.execute(
            notification_destinations.update()
                .where(notification_destinations.c.id == dest.id)
                .values(encrypted_options=dest.options)
        )

    op.drop_column("notification_destinations", "options")
    op.alter_column("notification_destinations", "encrypted_options", nullable=False)


def downgrade():
    pass
