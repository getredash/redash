"""give the standard group a type of its own

Revision ID: c4a7e9b21f08
Revises: 52ced47b8e8c
Create Date: 2026-09-15 18:05:00.000000

"""
import sqlalchemy as sa
from alembic import op

revision = "c4a7e9b21f08"
down_revision = "52ced47b8e8c"
branch_labels = None
depends_on = None

STANDARD_GROUP_TYPE = "standard"

GROUPS_THAT_NAME_IT_DIFFERENTLY = [
    ("gag", "Standard GAG"),
    ("heimstaden", "StandardUser"),
    ("a4res", "Nutzer"),
    ("wbg-fuerth", "user"),
]


def upgrade():
    connection = op.get_bind()

    connection.execute(
        sa.text(
            "UPDATE groups SET type = :standard "
            "WHERE lower(name) = 'standard' AND type = 'regular'"
        ),
        {"standard": STANDARD_GROUP_TYPE},
    )

    for slug, name in GROUPS_THAT_NAME_IT_DIFFERENTLY:
        connection.execute(
            sa.text(
                "UPDATE groups SET type = :standard "
                "FROM organizations "
                "WHERE groups.org_id = organizations.id "
                "AND organizations.slug = :slug "
                "AND groups.name = :name "
                "AND groups.type = 'regular'"
            ),
            {"standard": STANDARD_GROUP_TYPE, "slug": slug, "name": name},
        )

    op.create_index(
        "ix_groups_one_standard_per_org",
        "groups",
        ["org_id"],
        unique=True,
        postgresql_where=sa.text("type = 'standard'"),
    )


def downgrade():
    op.drop_index("ix_groups_one_standard_per_org", table_name="groups")

    connection = op.get_bind()
    connection.execute(
        sa.text("UPDATE groups SET type = 'regular' WHERE type = :standard"),
        {"standard": STANDARD_GROUP_TYPE},
    )
