from flask_script import Manager, prompt_pass
from redash import models

manager = Manager(help="Groups management commands.")

@manager.option('name', help="Group's name")
@manager.option('--org', dest='organization', default='default', help="The organization the user belongs to (leave blank for 'default').")
@manager.option('--permissions', dest='permissions', default=None, help="Comma seperated list of permissions ('create_dashboard', 'create_query', 'edit_dashboard', 'edit_query', 'view_query', 'view_source', 'execute_query', 'list_users', 'schedule_query', 'list_dashboards', 'list_alerts', 'list_data_sources') (leave blank for default).")
def create(name, permissions=None, organization='default'):
    print "Creating group (%s)..." % (name)

    org = models.Organization.get_by_slug(organization)

    permissions = extract_permissions_string(permissions)

    print "permissions: [%s]" % ",".join(permissions)

    try:
        models.Group.create(name=name, org=org, permissions=permissions)
    except Exception, e:
        print "Failed create group: %s" % e.message

@manager.option('id', help="Group's id")
@manager.option('--permissions', dest='permissions', default=None, help="Comma seperated list of permissions ('create_dashboard', 'create_query', 'edit_dashboard', 'edit_query', 'view_query', 'view_source', 'execute_query', 'list_users', 'schedule_query', 'list_dashboards', 'list_alerts', 'list_data_sources') (leave blank for default).")
def change_permissions(id, permissions=None):
    print "Change permissions of group %s ..." % id

    try:
        group = models.Group.get_by_id(id)
    except models.Group.DoesNotExist:
        print "User [%s] not found." % id
        return

    permissions = extract_permissions_string(permissions)
    print "current permissions [%s] will be modify to [%s]" % (",".join(group.permissions), ",".join(permissions))

    group.permissions = permissions

    try:
        group.save()
    except Exception, e:
        print "Failed change permission: %s" % e.message


def extract_permissions_string(permissions):
    if permissions is None:
        permissions = models.Group.DEFAULT_PERMISSIONS
    else:
        permissions = permissions.split(',')
        permissions = [p.strip() for p in permissions]
    return permissions


@manager.option('--org', dest='organization', default=None, help="The organization to limit to (leave blank for all).")
def list(organization=None):
    """List all groups"""
    if organization:
        org = models.Organization.get_by_slug(organization)
        groups = models.Group.select().where(models.Group.org == org)
    else:
        groups = models.Group.select()

    for i, group in enumerate(groups):
        if i > 0:
            print "-" * 20

        print "Id: {}\nName: {}\nType: {}\nOrganization: {}".format(group.id, group.name, group.type, group.org.slug)
