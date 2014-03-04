from redash import db
from redash import models

if __name__ == '__main__':
    db.connect_db()

    if not models.ActivityLog.table_exists():
        print "Creating activity_log table..."
        models.ActivityLog.create_table()

    db.close_db(None)