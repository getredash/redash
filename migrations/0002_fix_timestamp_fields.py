from redash.models import db

if __name__ == '__main__':
    db.connect_db()
    columns = (
        ('activity_log', 'created_at'),
        ('dashboards', 'created_at'),
        ('data_sources', 'created_at'),
        ('events', 'created_at'),
        ('groups', 'created_at'),
        ('queries', 'created_at'),
        ('widgets', 'created_at'),
        ('query_results', 'retrieved_at')
    )

    with db.database.transaction():
        for column in columns:
            db.database.execute_sql("ALTER TABLE {} ALTER COLUMN {} TYPE timestamp with time zone;".format(*column))

    db.close_db(None)
