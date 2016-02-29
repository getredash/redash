from flask_script import Manager
from redash import models

manager = Manager(help="Organization management commands.")


@manager.option('domains', help="comma separated list of domains to allow")
def set_google_apps_domains(domains):
    organization = models.Organization.select().first()

    organization.settings[models.Organization.SETTING_GOOGLE_APPS_DOMAINS] = domains.split(',')
    organization.save()

    print "Updated list of allowed domains to: {}".format(organization.google_apps_domains)


@manager.command
def show_google_apps_domains():
    organization = models.Organization.select().first()
    print "Current list of Google Apps domains: {}".format(organization.google_apps_domains)
