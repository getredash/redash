import os
from redash.models import db, Organization, Group
from redash import settings
from playhouse.migrate import PostgresqlMigrator, migrate

# The following is deprecated and should be defined with the Organization object
GOOGLE_APPS_DOMAIN = settings.set_from_string(os.environ.get("REDASH_GOOGLE_APPS_DOMAIN", ""))

if __name__ == '__main__':
    migrator = PostgresqlMigrator(db.database)

    with db.database.transaction():
        Organization.create_table()

        default_org = Organization.create(name="Default", slug='default', settings={
            Organization.SETTING_GOOGLE_APPS_DOMAINS: list(GOOGLE_APPS_DOMAIN)
        })

        column = Group.org
        column.default = default_org

        migrate(
            migrator.add_column('groups', 'org_id', column),
            migrator.add_column('events', 'org_id', column),
            migrator.add_column('data_sources', 'org_id', column),
            migrator.add_column('users', 'org_id', column),
            migrator.add_column('dashboards', 'org_id', column),
            migrator.add_column('queries', 'org_id', column),
            migrator.add_column('query_results', 'org_id', column),
        )

        # Change the uniqueness constraint on user email to be (org, email):
        migrate(
            migrator.drop_index('users', 'users_email'),
            migrator.add_index('users', ('org_id', 'email'), unique=True)
        )

    db.close_db(None)
