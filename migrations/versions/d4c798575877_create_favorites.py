"""empty message

Revision ID: d4c798575877
Revises: 1daa601d3ae5
Create Date: 2018-05-09 10:28:22.931442

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "d4c798575877"
down_revision = "1daa601d3ae5"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "favorites",
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("object_type", sa.Unicode(length=255), nullable=False),
        sa.Column("object_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade():
    op.drop_table("favorites")
