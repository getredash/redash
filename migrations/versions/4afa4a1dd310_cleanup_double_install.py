"""Clean up double install.

This is specifically for RIOT and will no-op for everyone else.

https://stacklet.atlassian.net/browse/ENG-2706

Revision ID: 4afa4a1dd310
Revises: fa68605eb530
Create Date: 2023-10-12 14:50:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from redash import models

# revision identifiers, used by Alembic.
revision = "4afa4a1dd310"
down_revision = "fa68605eb530"
branch_labels = None
depends_on = None


def get_groups(org, group_name):
    groups = (
        org.groups.filter(
            models.Group.name == group_name,
            models.Group.type == models.Group.BUILTIN_GROUP,
        )
        .order_by(models.Group.id.desc())
        .all()
    )

    assert len(groups) == 2
    assert groups[0].id > groups[1].id
    return groups


def upgrade():
    # if this user doesn't exist, then we're not in RIOT and should no-op
    user = models.User.find_by_email("deleteme@riotgames.com").first()
    if not user:
        return

    org = models.Organization.query.filter(models.Organization.slug == "default").one()

    dupe_admin_group = get_groups(org, "admin")[0]
    dupe_default_group = get_groups(org, "default")[0]

    # remove members from the dupe groups
    for group in (dupe_admin_group, dupe_default_group):
        for member in group.members(group.id):
            member.group_ids.remove(group.id)
            models.db.session.add(member)

    # ensure dupe groups have no members
    models.db.session.flush()
    assert dupe_admin_group.members(dupe_admin_group.id).count() == 0
    assert dupe_default_group.members(dupe_default_group.id).count() == 0

    # delete the dupe objects
    models.db.session.delete(dupe_admin_group)
    models.db.session.delete(dupe_default_group)
    models.db.session.delete(user)
    models.db.session.commit()


def downgrade():
    pass
