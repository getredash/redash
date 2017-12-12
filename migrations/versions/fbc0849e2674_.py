"""
Merge upstream fulltext search

This formerly merged the fulltext search changes (6b5be7e0a0ef, 5ec5c84ba61e)
with upstream's 7671dca4e604 - but then those changes moved in the revision
graph to be direct descendants of that upstream revision, so the merge point
has been moved.

Revision ID: fbc0849e2674
Revises: 6b5be7e0a0ef, eb2f788f997e
Create Date: 2017-12-12 04:45:34.360587
"""

# revision identifiers, used by Alembic.
revision = 'fbc0849e2674'
down_revision = ('6b5be7e0a0ef', '58f810489c47')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
