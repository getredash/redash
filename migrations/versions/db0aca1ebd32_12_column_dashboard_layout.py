"""12-column dashboard layout

Revision ID: db0aca1ebd32
Revises: 9e8c841d1a30
Create Date: 2025-03-31 13:45:43.160893

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'db0aca1ebd32'
down_revision = '9e8c841d1a30'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
    UPDATE widgets
    SET options = jsonb_set(options, '{position,col}', to_json((options->'position'->>'col')::int * 2)::jsonb);
    UPDATE widgets
    SET options = jsonb_set(options, '{position,sizeX}', to_json((options->'position'->>'sizeX')::int * 2)::jsonb);
    """)


def downgrade():
    op.execute("""
    UPDATE widgets
    SET options = jsonb_set(options, '{position,col}', to_json((options->'position'->>'col')::int / 2)::jsonb);
    UPDATE widgets
    SET options = jsonb_set(options, '{position,sizeX}', to_json((options->'position'->>'sizeX')::int / 2)::jsonb);
    """)
