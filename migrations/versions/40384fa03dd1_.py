"""Upgrade 'data_scanned' column to form used in upstream

Revision ID: 40384fa03dd1
Revises: 58f810489c47
Create Date: 2018-01-18 18:44:04.917081

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql.expression import func, cast

# revision identifiers, used by Alembic.
revision = '40384fa03dd1'
down_revision = 'fbc0849e2674'
branch_labels = None
depends_on = None


def upgrade():
    qr = sa.sql.table('query_results',
                  sa.sql.column('data_scanned', sa.String),
                  sa.sql.column('data', sa.String))
    op.execute(
        qr.update()
        .where(qr.c.data_scanned != '')
        .where(qr.c.data_scanned != 'error')
        .where(qr.c.data_scanned != 'N/A')
        .values(data=cast(
            func.jsonb_set(cast(qr.c.data, JSONB),
                           '{metadata}',
                           cast('{"data_scanned": ' +
                                qr.c.data_scanned + '}',
                                JSONB)),
            sa.String)))
    op.drop_column('query_results', 'data_scanned')


def downgrade():
    op.add_column('query_results', sa.Column('data_scanned', sa.String(length=255), nullable=True))
