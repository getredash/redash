from playhouse.migrate import PostgresqlMigrator, migrate

from redash.models import db

if __name__ == '__main__':
    db.connect_db()
    migrator = PostgresqlMigrator(db.database)

    with db.database.transaction():
        migrate(
            migrator.drop_column('groups', 'tables')
        )

    db.close_db(None)
