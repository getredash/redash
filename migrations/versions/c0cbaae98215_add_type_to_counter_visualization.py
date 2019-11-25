"""Add type to counter visualization

Revision ID: c0cbaae98215
Revises: e5c7a4e2df4d
Create Date: 2019-11-25 14:08:05.155120

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import table


from redash.models import MutableDict, PseudoJSON


# revision identifiers, used by Alembic.
revision = 'c0cbaae98215'
down_revision = 'e5c7a4e2df4d'
branch_labels = None
depends_on = None


def upgrade():
    visualizations = table(
        'visualizations',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('type', sa.Unicode(length=100), nullable=False),
        sa.Column('options', MutableDict.as_mutable(PseudoJSON)))

    conn = op.get_bind()
    for visualization in conn.execute(visualizations.select().where(visualizations.c.type == 'COUNTER')):
        options = visualization.options
        # map existing counters to countRows type when countRow is true
        if 'countRow' in options and options['countRow']:
            options['counterType'] = 'countRows'
        else:
            options['counterType'] = 'rowValue'

        # remove countRow from options
        options.pop('countRow', None)

        conn.execute(
            visualizations
                .update()
                .where(visualizations.c.id == visualization.id)
                .values(options=MutableDict(options)))

def downgrade():
    visualizations = table(
        'visualizations',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('type', sa.Unicode(length=100), nullable=False),
        sa.Column('options', MutableDict.as_mutable(PseudoJSON)))

    conn = op.get_bind()
    for visualization in conn.execute(visualizations.select().where(visualizations.c.type == 'COUNTER')):
        options = visualization.options
        # use countRow option when counterType is 'countRows'
        if 'counterType' in options and options['counterType'] == 'countRows':
            options['countRow'] = True
        else:
            options['countRow'] = False

        # remove counterType from options
        options.pop('counterType', None)

        conn.execute(
            visualizations
                .update()
                .where(visualizations.c.id == visualization.id)
                .values(options=MutableDict(options)))
