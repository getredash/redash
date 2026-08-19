"""12-column dashboard layout

Revision ID: db0aca1ebd32
Revises: 1655999df5e3
Create Date: 2025-03-31 13:45:43.160893

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'db0aca1ebd32'
down_revision = '1655999df5e3'
branch_labels = None
depends_on = None


def upgrade():
    # Guard against widgets whose options lack the position keys (e.g. rows written
    # through the API with options = '{}'): jsonb_set() with a NULL new_value returns
    # NULL, which would violate the NOT NULL constraint on widgets.options.
    # The 9-digit bound also keeps the ::int cast and the doubling within int4 range.
    op.execute("""
    UPDATE widgets
    SET options = jsonb_set(options, '{position,col}', to_json((options->'position'->>'col')::int * 2)::jsonb)
    WHERE options->'position'->>'col' ~ '^-?[0-9]{1,9}$';
    UPDATE widgets
    SET options = jsonb_set(options, '{position,sizeX}', to_json((options->'position'->>'sizeX')::int * 2)::jsonb)
    WHERE options->'position'->>'sizeX' ~ '^-?[0-9]{1,9}$';
    """)


def downgrade():
    # Halve exactly the values the original statement could halve (anything in
    # int4 range, which also covers everything upgrade() can produce) and skip
    # the rest instead of aborting on the cast.
    op.execute("""
    UPDATE widgets
    SET options = jsonb_set(options, '{position,col}', to_json((options->'position'->>'col')::bigint / 2)::jsonb)
    WHERE options->'position'->>'col' ~ '^-?[0-9]{1,10}$'
      AND (options->'position'->>'col')::bigint BETWEEN -2147483648 AND 2147483647;
    UPDATE widgets
    SET options = jsonb_set(options, '{position,sizeX}', to_json((options->'position'->>'sizeX')::bigint / 2)::jsonb)
    WHERE options->'position'->>'sizeX' ~ '^-?[0-9]{1,10}$'
      AND (options->'position'->>'sizeX')::bigint BETWEEN -2147483648 AND 2147483647;
    """)
