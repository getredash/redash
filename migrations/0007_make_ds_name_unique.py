from redash.models import db

if __name__ == '__main__':
    db.connect_db()

    with db.database.transaction():
        # Make sure all data sources names are unique.
        db.database.execute_sql("""UPDATE data_sources SET name = name || ' ' || id;""")
        # Add unique constraint on data_sources.name.
        db.database.execute_sql("ALTER TABLE data_sources ADD CONSTRAINT unique_name UNIQUE (name);")

    db.close_db(None)
