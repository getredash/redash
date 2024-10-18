"""set default alert selector

Revision ID: 1655999df5e3
Revises: 7205816877ec
Create Date: 2024-10-18 11:24:49

"""

from redash.models import db

# revision identifiers, used by Alembic.
revision = '1655999df5e3'
down_revision = '7205816877ec'
branch_labels = None
depends_on = None


def upgrade():
    db.session.execute("""
    UPDATE alerts
    SET options = jsonb_set(options, '{selector}', '"first"')
    WHERE options->>'selector' IS NULL;
    """)
    db.session.commit()

def downgrade():
    pass
