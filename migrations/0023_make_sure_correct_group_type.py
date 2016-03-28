from redash import models

if __name__ == '__main__':
    with models.db.database.transaction():
        groups = models.Group.select(models.Group.id, models.Group.type).where(models.Group.name=='default')
        for group in groups:
            group.type = models.Group.BUILTIN_GROUP
            group.save(only=[models.Group.type])
