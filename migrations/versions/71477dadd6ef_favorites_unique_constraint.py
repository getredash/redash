"""favorites_unique_constraint

Revision ID: 71477dadd6ef
Revises: 0f740a081d20
Create Date: 2018-07-11 12:49:52.792123

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "71477dadd6ef"
down_revision = "0f740a081d20"
branch_labels = None
depends_on = None


def upgrade():
    op.create_unique_constraint(
        "unique_favorite", "favorites", ["object_type", "object_id", "user_id"]
    )


def downgrade():
    op.drop_constraint("unique_favorite", "favorites", type_="unique")
