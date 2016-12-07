from redash.models import db, Alert, AlertSubscription

if __name__ == '__main__':
    with db.database.transaction():
        # There was an AWS/GCE image created without this table, to make sure this exists we run this migration.
        if not AlertSubscription.table_exists():
            AlertSubscription.create_table()

    db.close_db(None)
