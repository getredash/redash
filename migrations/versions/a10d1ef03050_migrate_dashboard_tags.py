"""migrate_dashboard_tags

Revision ID: a10d1ef03050
Revises: 79f9d9c36c99
Create Date: 2018-05-10 14:57:56.218807

"""
import re
from funcy import flatten, compact
from alembic import op
import sqlalchemy as sa
from redash import models


# revision identifiers, used by Alembic.
revision = 'a10d1ef03050'
down_revision = '79f9d9c36c99'
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
