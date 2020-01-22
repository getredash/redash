"""Update widget's position data based on dashboard layout.

Revision ID: 969126bd800f
Revises: 6b5be7e0a0ef
Create Date: 2018-01-31 15:20:30.396533

"""

import simplejson
from alembic import op
import sqlalchemy as sa

from redash.models import Dashboard, Widget, db


# revision identifiers, used by Alembic.
revision = "969126bd800f"
down_revision = "6b5be7e0a0ef"
branch_labels = None
depends_on = None


def upgrade():
    # Update widgets position data:
    column_size = 3
    print("Updating dashboards position data:")
    dashboard_result = db.session.execute("SELECT id, layout FROM dashboards")
    for dashboard in dashboard_result:
        print("  Updating dashboard: {}".format(dashboard["id"]))
        layout = simplejson.loads(dashboard["layout"])

        print("    Building widgets map:")
        widgets = {}
        widget_result = db.session.execute(
            "SELECT id, options, width FROM widgets WHERE dashboard_id=:dashboard_id",
            {"dashboard_id": dashboard["id"]},
        )
        for w in widget_result:
            print("    Widget: {}".format(w["id"]))
            widgets[w["id"]] = w
        widget_result.close()

        print("    Iterating over layout:")
        for row_index, row in enumerate(layout):
            print("      Row: {} - {}".format(row_index, row))
            if row is None:
                continue

            for column_index, widget_id in enumerate(row):
                print("      Column: {} - {}".format(column_index, widget_id))
                widget = widgets.get(widget_id)

                if widget is None:
                    continue

                options = simplejson.loads(widget["options"]) or {}
                options["position"] = {
                    "row": row_index,
                    "col": column_index * column_size,
                    "sizeX": column_size * widget.width,
                }

                db.session.execute(
                    "UPDATE widgets SET options=:options WHERE id=:id",
                    {"options": simplejson.dumps(options), "id": widget_id},
                )

    dashboard_result.close()
    db.session.commit()

    # Remove legacy columns no longer in use.
    op.drop_column("widgets", "type")
    op.drop_column("widgets", "query_id")


def downgrade():
    op.add_column(
        "widgets",
        sa.Column("query_id", sa.INTEGER(), autoincrement=False, nullable=True),
    )
    op.add_column(
        "widgets",
        sa.Column("type", sa.VARCHAR(length=100), autoincrement=False, nullable=True),
    )
