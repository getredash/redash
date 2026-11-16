"""disable auto limit on existing Athena queries

Athena didn't support auto limit, so the editor hid the checkbox, but new
queries still saved apply_auto_limit = true by default. Now that Athena
supports it, clear that flag on existing Athena queries so they keep returning
full results (and keep their query hashes).

Revision ID: f902d1b7cafc
Revises: 2f2a8a6f9c21
Create Date: 2026-11-16 12:00:00.000000

"""
from alembic import op
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision = 'f902d1b7cafc'
down_revision = '2f2a8a6f9c21'
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        text(
            """
            UPDATE queries
            SET options = jsonb_set(options, '{apply_auto_limit}', 'false')
            WHERE options ->> 'apply_auto_limit' = 'true'
              AND data_source_id IN (SELECT id FROM data_sources WHERE type = 'athena')
            """
        )
    )


def downgrade():
    # Before this revision Athena ignored apply_auto_limit, so there's nothing to restore.
    pass
