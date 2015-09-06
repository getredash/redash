from redash import models

if __name__ == '__main__':
    default_group = models.Group.get(models.Group.name=='default')
    default_group.permissions.append('list_users')
    default_group.save()
