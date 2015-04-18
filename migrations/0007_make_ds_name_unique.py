from redash.models import db

if __name__ == '__main__':
    db.connect_db()

    with db.database.transaction():
        # Make sure all data sources names are unique.
        db.database.execute_sql("""
        UPDATE data_sources
        SET name = new_names.name
        FROM (
            SELECT id, name || ' ' || id as name
            FROM (SELECT id, name, rank() OVER (PARTITION BY name ORDER BY created_at ASC) FROM data_sources) ds WHERE rank > 1
        ) AS new_names
        WHERE data_sources.id = new_names.id;
        """)
        # Add unique constraint on data_sources.name.
        db.database.execute_sql("ALTER TABLE data_sources ADD CONSTRAINT unique_name UNIQUE (name);")

    db.close_db(None)
