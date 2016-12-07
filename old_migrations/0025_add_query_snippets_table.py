from redash.models import db, QuerySnippet

if __name__ == '__main__':
    with db.database.transaction():
        if not QuerySnippet.table_exists():
            QuerySnippet.create_table()

    db.close_db(None)
