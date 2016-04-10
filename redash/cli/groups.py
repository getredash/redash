from flask_script import Manager, prompt_pass
from redash import models

manager = Manager(help="Users management commands. This commands assume single organization operation.")

@manager.option('name', help="Group's name")
@manager.option('--permissions', dest='permissions', default=None, help="Comma seperated list of permissions ('create_dashboard', 'create_query', 'edit_dashboard', 'edit_query', 'view_query', 'view_source', 'execute_query', 'list_users', 'schedule_query', 'list_dashboards', 'list_alerts', 'list_data_sources') (leave blank for default).")
def create(name, permissions=None):
  print "Creating group (%s)..." % (name)

  org = models.Organization.get_by_slug('default')
  
  if permissions is None:
    permissions = models.Group.DEFAULT_PERMISSIONS
  else:
    permissions = permissions.split(',')
    permissions = [p.strip() for p in permissions]
  print "permissions: [%s]" % ",".join(permissions)
    
  models.Group.create(name=name, org=org, permissions=permissions)

@manager.option('id', help="Group's id")
@manager.option('--permissions', dest='permissions', default=None, help="Comma seperated list of permissions ('create_dashboard', 'create_query', 'edit_dashboard', 'edit_query', 'view_query', 'view_source', 'execute_query', 'list_users', 'schedule_query', 'list_dashboards', 'list_alerts', 'list_data_sources') (leave blank for default).")
def change_permission(id, permissions=None):
  print "Change permissisons of group %s ..." % (id)

  if permissions is None:
    permissions = models.Group.DEFAULT_PERMISSIONS
  else:
    permissions = permissions.split(',')
    permissions = [p.strip() for p in permissions]
  print "permissions: [%s]" % ",".join(permissions)
  
  models.Group.update(permissions=permissions).where(models.Group.id==id).execute()