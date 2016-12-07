from redash import models

if __name__ == '__main__':

    default_group = models.Group.select(models.Group.id, models.Group.permissions).where(models.Group.name=='default').first()
    default_group.permissions.append('list_users')
    default_group.save(only=[models.Group.permissions])
