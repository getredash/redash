from click import argument, option
from flask.cli import AppGroup

from redash import models

manager = AppGroup(help="Organization management commands.")


@manager.command(name="set_google_apps_domains")
@argument("domains")
def set_google_apps_domains(domains):
    """
    Sets the allowable domains to the comma separated list DOMAINS.
    """
    organization = models.Organization.query.first()
    k = models.Organization.SETTING_GOOGLE_APPS_DOMAINS
    organization.settings[k] = domains.split(",")
    models.db.session.add(organization)
    models.db.session.commit()
    print("Updated list of allowed domains to: {}".format(organization.google_apps_domains))


@manager.command(name="show_google_apps_domains")
def show_google_apps_domains():
    organization = models.Organization.query.first()
    print("Current list of Google Apps domains: {}".format(", ".join(organization.google_apps_domains)))


@manager.command(name="create")
@argument("name")
@option(
    "--slug",
    "slug",
    default="default",
    help="The slug the organization belongs to (leave blank for " "'default').",
)
def create(name, slug="default"):
    print("Creating organization (%s)..." % (name))

    try:
        models.db.session.add(models.Organization(name=name, slug=slug, settings={}))
        models.db.session.commit()
    except Exception as e:
        print("Failed create organization: %s" % e)
        exit(1)


@manager.command(name="list")
def list_command():
    """List all organizations"""
    orgs = models.Organization.query
    for i, org in enumerate(orgs.order_by(models.Organization.name)):
        if i > 0:
            print("-" * 20)

        print("Id: {}\nName: {}\nSlug: {}".format(org.id, org.name, org.slug))
