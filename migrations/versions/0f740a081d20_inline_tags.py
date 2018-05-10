"""inline_tags

Revision ID: 0f740a081d20
Revises: a92d92aa678e
Create Date: 2018-05-10 15:47:56.120338

"""
import re
from funcy import flatten, compact
from alembic import op
import sqlalchemy as sa
from redash import models


# revision identifiers, used by Alembic.
revision = '0f740a081d20'
down_revision = 'a92d92aa678e'
branch_labels = None
depends_on = None


def upgrade():
    tags_regex = re.compile('^([\w\s]+):|#([\w-]+)', re.I | re.U)
    for dashboard in models.Dashboard.query:
        tags = compact(flatten(tags_regex.findall(dashboard.name)))
        if tags:
            dashboard.tags = tags
    
    models.db.session.commit()


def downgrade():
    pass
