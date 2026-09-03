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
    # Skip widgets that have no position values, e.g. rows written through the
    # API with options = '{}'. Without the filter the cast yields NULL,
    # jsonb_set() returns NULL for a NULL new_value, and the update fails the
    # NOT NULL constraint on widgets.options.
    op.execute("""
    UPDATE widgets
    SET options = jsonb_set(options, '{position,col}', to_json((options->'position'->>'col')::int * 2)::jsonb)
    WHERE options->'position'->>'col' IS NOT NULL;
    UPDATE widgets
    SET options = jsonb_set(options, '{position,sizeX}', to_json((options->'position'->>'sizeX')::int * 2)::jsonb)
    WHERE options->'position'->>'sizeX' IS NOT NULL;
    """)


def downgrade():
    op.execute("""
    UPDATE widgets
    SET options = jsonb_set(options, '{position,col}', to_json((options->'position'->>'col')::int / 2)::jsonb)
    WHERE options->'position'->>'col' IS NOT NULL;
    UPDATE widgets
    SET options = jsonb_set(options, '{position,sizeX}', to_json((options->'position'->>'sizeX')::int / 2)::jsonb)
    WHERE options->'position'->>'sizeX' IS NOT NULL;
    """)
