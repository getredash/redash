from sys import exit

from click import argument
from flask.cli import AppGroup

from redash import models
from redash.authentication.metr_sso import STANDARD_GROUP_TYPE

manager = AppGroup(help="METR-specific management commands.")

STANDARD_GROUP_PERMISSIONS = ["list_dashboards", "execute_query"]


@manager.command(name="create_standard_group")
@argument("organization")
def create_standard_group(organization):
    org = models.Organization.get_by_slug(organization)
    if org is None:
        print(f"There is no organization called {organization}.")
        exit(1)

    existing = models.Group.query.filter(
        models.Group.org == org,
        models.Group.type == STANDARD_GROUP_TYPE,
    ).first()
    if existing is not None:
        print(f"{organization} already has a standard group ({existing.name}).")
        return

    group = models.Group(
        name="standard",
        type=STANDARD_GROUP_TYPE,
        org=org,
        permissions=STANDARD_GROUP_PERMISSIONS,
    )
    models.db.session.add(group)
    models.db.session.commit()
    print(f"Created the standard group for {organization}. It grants no data source or dashboard yet.")
