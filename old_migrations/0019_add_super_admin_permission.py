from redash import models

if __name__ == '__main__':
    admin_group = models.Group.get(models.Group.name=='admin')
    admin_group.permissions.append('super_admin')
    admin_group.save()
