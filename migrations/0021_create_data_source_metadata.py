from redash.models import db, DataSourceTable, DataSourceColumn

if __name__ == '__main__':
    with db.database.transaction():
        DataSourceTable.create_table()
        DataSourceColumn.create_table()

    db.close_db(None)
