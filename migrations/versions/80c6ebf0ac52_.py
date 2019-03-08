"""Add global options field for data sources

Revision ID: 80c6ebf0ac52
Revises: e5c7a4e2df4d
Create Date: 2019-03-06 16:02:14.171877

"""
import json
from alembic import op
import sqlalchemy as sa

from redash.models import MutableDict, PseudoJSON


# revision identifiers, used by Alembic.
revision = '80c6ebf0ac52'
down_revision = 'e5c7a4e2df4d'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('data_sources', sa.Column(
		'global_options',
		MutableDict.as_mutable(PseudoJSON),
		nullable=False,
		server_default=json.dumps({})
    ))

def downgrade():
    op.drop_column('data_sources', 'global_options')
