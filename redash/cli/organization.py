from click import argument
from flask.cli import AppGroup

from redash import models

manager = AppGroup(help="Organization management commands.")


@manager.command()
@argument('domains')
def set_google_apps_domains(domains):
    """
    Sets the allowable domains to the comma separated list DOMAINS.
    """
    organization = models.Organization.query.first()
    k = models.Organization.SETTING_GOOGLE_APPS_DOMAINS
    organization.settings[k] = domains.split(',')
    models.db.session.add(organization)
    models.db.session.commit()
    print "Updated list of allowed domains to: {}".format(
        organization.google_apps_domains)


@manager.command()
def show_google_apps_domains():
    organization = models.Organization.query.first()
    print "Current list of Google Apps domains: {}".format(
        ', '.join(organization.google_apps_domains))


@manager.command()
def list():
    """List all organizations"""
    orgs = models.Organization.query
    for i, org in enumerate(orgs):
        if i > 0:
            print "-" * 20

        print "Id: {}\nName: {}\nSlug: {}".format(org.id, org.name, org.slug)
