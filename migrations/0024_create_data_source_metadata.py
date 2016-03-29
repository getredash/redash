from redash.models import db, DataSourceTable, DataSourceColumn, DataSourceJoin

if __name__ == '__main__':
    with db.database.transaction():
        if not DataSourceTable.table_exists():
            DataSourceTable.create_table()
        if not DataSourceColumn.table_exists():
            DataSourceColumn.create_table()
        if not DataSourceJoin.table_exists():
            DataSourceJoin.create_table()

    db.close_db(None)
