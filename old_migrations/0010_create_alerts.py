from redash.models import db, Alert, AlertSubscription

if __name__ == '__main__':
    with db.database.transaction():
        Alert.create_table()
        AlertSubscription.create_table()

    db.close_db(None)
