from redash.models import db
from redash import models


if __name__ == '__main__':
    db.connect_db()

    if not models.Event.table_exists():
        print "Creating events table..."
        models.Event.create_table()

    db.close_db(None)