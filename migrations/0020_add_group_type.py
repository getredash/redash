from redash.models import db, Group
from playhouse.migrate import PostgresqlMigrator, migrate

if __name__ == '__main__':
    migrator = PostgresqlMigrator(db.database)

    with db.database.transaction():
        # change the groups list on a user object to be an ids list
        migrate(
            migrator.add_column('groups', 'type', Group.type)
        )

        for name in ['default', 'admin']:
            group = Group.get(Group.name==name)
            group.type = Group.BUILTIN_GROUP
            group.save()

    db.close_db(None)

