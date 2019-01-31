"""add_encrypted_options_to_data_sources

Revision ID: 98af61feea92
Revises: 73beceabb948
Create Date: 2019-01-31 09:21:31.517265

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '98af61feea92'
down_revision = '73beceabb948'
branch_labels = None
depends_on = None


def upgrade():
    # TODO:
    # create column
    # copy values
    # drop old column
    pass


def downgrade():
    pass
