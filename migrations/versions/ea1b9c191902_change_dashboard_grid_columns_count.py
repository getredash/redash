"""Change Dashboard grid columns count

Revision ID: ea1b9c191902
Revises: e5c7a4e2df4d
Create Date: 2019-11-24 21:57:33.497558

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import table

from redash.models import MutableDict, PseudoJSON


# revision identifiers, used by Alembic.
revision = 'ea1b9c191902'
down_revision = 'e5c7a4e2df4d'
branch_labels = None
depends_on = None


def upgrade():
    widgets = table(
        'widgets',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('options', MutableDict.as_mutable(PseudoJSON)))

    conn = op.get_bind()
    for widget in conn.execute(widgets.select()):
        options = widget.options
        # column value was 6 and now is 12, so double existing values
        if 'position' in options:
            if 'col' in options['position']:
                options['position']['col'] *= 2
            if 'sizeX' in options['position']:
                options['position']['sizeX'] *= 2
            if 'minSizeX' in options['position']:
                options['position']['minSizeX'] *= 2
            if 'maxSizeX' in options['position']:
                options['position']['maxSizeX'] *= 2

        conn.execute(
            widgets
                .update()
                .where(widgets.c.id == widget.id)
                .values(options=MutableDict(options)))

def downgrade():
    widgets = table(
        'widgets',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('options', MutableDict.as_mutable(PseudoJSON)))

    conn = op.get_bind()
    for widget in conn.execute(widgets.select()):
        options = widget.options
        # column value from 12 to 6 again, so divide values by 2
        if 'position' in options:
            if 'col' in options['position']:
                options['position']['col'] //= 2
            if 'sizeX' in options['position']:
                options['position']['sizeX'] //= 2
            if 'minSizeX' in options['position']:
                options['position']['minSizeX'] //= 2
            if 'maxSizeX' in options['position']:
                options['position']['maxSizeX'] //= 2

        conn.execute(
            widgets
                .update()
                .where(widgets.c.id == widget.id)
                .values(options=MutableDict(options)))
