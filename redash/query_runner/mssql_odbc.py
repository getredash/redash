from redash.query_runner import register
from redash.query_runner.mssql import SqlServer


class SQLServerODBC(SqlServer):
    """
    Kept so existing "Microsoft SQL Server (ODBC)" data sources keep working.
    Both types now use the same mssql-python driver, so new data sources
    should use the "mssql" type.
    """

    deprecated = True

    @classmethod
    def name(cls):
        return "Microsoft SQL Server (ODBC)"

    @classmethod
    def type(cls):
        return "mssql_odbc"


register(SQLServerODBC)
