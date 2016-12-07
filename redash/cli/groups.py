from sys import exit

from sqlalchemy.orm.exc import NoResultFound
from flask.cli import AppGroup
from click import argument, option

from redash import models

manager = AppGroup(help="Groups management commands.")


@manager.command()
@argument('name')
@option('--org', 'organization', default='default',
        help="The organization the user belongs to (leave blank for "
        "'default').")
@option('--permissions', default=None,
        help="Comma separated list of permissions ('create_dashboard',"
        " 'create_query', 'edit_dashboard', 'edit_query', "
        "'view_query', 'view_source', 'execute_query', 'list_users',"
        " 'schedule_query', 'list_dashboards', 'list_alerts',"
        " 'list_data_sources') (leave blank for default).")
def create(name, permissions=None, organization='default'):
    print "Creating group (%s)..." % (name)

    org = models.Organization.get_by_slug(organization)

    permissions = extract_permissions_string(permissions)

    print "permissions: [%s]" % ",".join(permissions)

    try:
        models.db.session.add(models.Group(
            name=name, org=org,
            permissions=permissions))
        models.db.session.commit()
    except Exception, e:
        print "Failed create group: %s" % e.message
        exit(1)


@manager.command()
@argument('group_id')
@option('--permissions', default=None,
        help="Comma separated list of permissions ('create_dashboard',"
        " 'create_query', 'edit_dashboard', 'edit_query',"
        " 'view_query', 'view_source', 'execute_query', 'list_users',"
        " 'schedule_query', 'list_dashboards', 'list_alerts',"
        " 'list_data_sources') (leave blank for default).")
def change_permissions(group_id, permissions=None):
    print "Change permissions of group %s ..." % group_id

    try:
        group = models.Group.query.get(group_id)
    except NoResultFound:
        print "User [%s] not found." % group_id
        exit(1)

    permissions = extract_permissions_string(permissions)
    print "current permissions [%s] will be modify to [%s]" % (
        ",".join(group.permissions), ",".join(permissions))

    group.permissions = permissions

    try:
        models.db.session.add(group)
        models.db.session.commit()
    except Exception, e:
        print "Failed change permission: %s" % e.message
        exit(1)


def extract_permissions_string(permissions):
    if permissions is None:
        permissions = models.Group.DEFAULT_PERMISSIONS
    else:
        permissions = permissions.split(',')
        permissions = [p.strip() for p in permissions]
    return permissions


@manager.command()
@option('--org', 'organization', default=None,
        help="The organization to limit to (leave blank for all).")
def list(organization=None):
    """List all groups"""
    if organization:
        org = models.Organization.get_by_slug(organization)
        groups = models.Group.query.filter(models.Group.org == org)
    else:
        groups = models.Group.query

    for i, group in enumerate(groups):
        if i > 0:
            print "-" * 20

        print "Id: {}\nName: {}\nType: {}\nOrganization: {}".format(
            group.id, group.name, group.type, group.org.slug)
