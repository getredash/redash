"""Add is_draft status to queries and dashboards

Revision ID: 65fc9ede4746
Revises: 
Create Date: 2016-12-07 18:08:13.395586

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
from sqlalchemy.exc import ProgrammingError

revision = '65fc9ede4746'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    try:
        op.add_column('queries', sa.Column('is_draft', sa.Boolean, default=True, index=True))
        op.add_column('dashboards', sa.Column('is_draft', sa.Boolean, default=True, index=True))
        op.execute("UPDATE queries SET is_draft = (name = 'New Query')")
        op.execute("UPDATE dashboards SET is_draft = false")
    except ProgrammingError as e:
        # The columns might exist if you ran the old migrations.
        if 'column "is_draft" of relation "queries" already exists' in e.message:
            print "Can't run this migration as you already have is_draft columns, please run:"
            print "./manage.py db stamp {} # you might need to alter the command to match your environment.".format(revision)
            exit()


def downgrade():
    op.drop_column('queries', 'is_draft')
    op.drop_column('dashboards', 'is_draft')
