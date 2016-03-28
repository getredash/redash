from redash import models

if __name__ == '__main__':
    with models.db.database.transaction():
        groups = models.Group.select(models.Group.id, models.Group.permissions).where(models.Group.name=='default')
        for group in groups:
            group.permissions.append('list_dashboards')
            group.permissions.append('list_alerts')
            group.permissions.append('list_data_sources')
            group.save(only=[models.Group.permissions])
