"""Update widget's position data based on dashboard layout.

Revision ID: 969126bd800f
Revises: 6b5be7e0a0ef
Create Date: 2018-01-31 15:20:30.396533

"""
import json
from alembic import op
import sqlalchemy as sa

from redash.models import Dashboard, Widget, db


# revision identifiers, used by Alembic.
revision = '969126bd800f'
down_revision = '6b5be7e0a0ef'
branch_labels = None
depends_on = None


def upgrade():
    # Update widgets position data:
    column_size = 3
    print "Updating dashboards position data:"
    for dashboard in Dashboard.query:
        print "  Updating dashboard: {}".format(dashboard.id)
        layout = json.loads(dashboard.layout)

        print "    Building widgets map:"
        widgets = {}
        for w in dashboard.widgets:
            print "    Widget: {}".format(w.id)
            widgets[w.id] = w

        print "    Iterating over layout:"
        for row_index, row in enumerate(layout):
            print "      Row: {} - {}".format(row_index, row)
            if row is None:
                continue

            for column_index, widget_id in enumerate(row):
                print "      Column: {} - {}".format(column_index, widget_id)
                widget = widgets.get(widget_id)

                if widget is None:
                    continue

                options = json.loads(widget.options) or {}
                options['position'] = {
                    "row": row_index,
                    "col": column_index * column_size,
                    "sizeX": column_size * widget.width
                }

                widget.options = json.dumps(options)

                db.session.add(widget)

    db.session.commit()

    # Remove legacy columns no longer in use.
    op.drop_column('widgets', 'type')
    op.drop_column('widgets', 'query_id')


def downgrade():
    op.add_column('widgets', sa.Column('query_id', sa.INTEGER(), autoincrement=False, nullable=True))
    op.add_column('widgets', sa.Column('type', sa.VARCHAR(length=100), autoincrement=False, nullable=True))
