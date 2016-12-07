from collections import defaultdict
from redash.models import db, DataSourceGroup, DataSource, Group, Organization, User
from playhouse.migrate import PostgresqlMigrator, migrate
import peewee

if __name__ == '__main__':
    migrator = PostgresqlMigrator(db.database)

    with db.database.transaction():
        # Add type to groups
        migrate(
            migrator.add_column('groups', 'type', Group.type)
        )

        for name in ['default', 'admin']:
            group = Group.get(Group.name==name)
            group.type = Group.BUILTIN_GROUP
            group.save()

        # Create association table between data sources and groups
        DataSourceGroup.create_table()

        # add default to existing data source:
        default_org = Organization.get_by_id(1)
        default_group = Group.get(Group.name=="default")
        for ds in DataSource.all(default_org):
            DataSourceGroup.create(data_source=ds, group=default_group)

        # change the groups list on a user object to be an ids list
        migrate(
            migrator.rename_column('users', 'groups', 'old_groups'),
        )

        migrate(migrator.add_column('users', 'groups', User.groups))

        group_map = dict(map(lambda g: (g.name, g.id), Group.select()))
        user_map = defaultdict(list)
        for user in User.select(User, peewee.SQL('old_groups')):
            group_ids = [group_map[group] for group in user.old_groups]
            user.update_instance(groups=group_ids)

        migrate(migrator.drop_column('users', 'old_groups'))

    db.close_db(None)
