"""update_changes_table

Revision ID: 4952e040e9dd
Revises: e5c7a4e2df4d
Create Date: 2020-04-06 13:22:15.256635

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '4952e040e9dd'
down_revision = 'e5c7a4e2df4d'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("DELETE FROM changes")
    op.drop_column("changes", "object_version")
    op.add_column("changes", sa.Column("org_id", sa.Integer(), nullable=False))
    op.create_index(
        "ix_changes_object_ref",
        "changes",
        ["object_type", "object_id"],
        unique=False,
    )


def downgrade():
    op.drop_column("changes", "org_id")
    op.add_column("changes", sa.Column("object_version", sa.Integer(), nullable=True, default=0))
    op.execute("UPDATE changes SET object_version = 0")
    op.alter_column("changes", "object_version", nullable=False)
    op.drop_index("ix_changes_object_ref")
