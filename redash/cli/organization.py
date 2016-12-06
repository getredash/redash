from click import Group, argument
from redash import models

manager = Group(help="Organization management commands.")


@manager.command()
@argument('domains')
def set_google_apps_domains(domains):
    """
    Sets the allowable domains to the comma separated list DOMAINS.
    """
    organization = models.Organization.select().first()
    k = models.Organization.SETTING_GOOGLE_APPS_DOMAINS
    organization.settings[k] = domains.split(',')
    organization.save()

    print "Updated list of allowed domains to: {}".format(
        organization.google_apps_domains)


@manager.command()
def show_google_apps_domains():
    organization = models.Organization.select().first()
    print "Current list of Google Apps domains: {}".format(
        ', '.join(organization.google_apps_domains))


@manager.command()
def list():
    """List all organizations"""
    orgs = models.Organization.select()
    for i, org in enumerate(orgs):
        if i > 0:
            print "-" * 20

        print "Id: {}\nName: {}\nSlug: {}".format(org.id, org.name, org.slug)
