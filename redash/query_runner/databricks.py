import datetime
import sqlparse
from redash.query_runner import (
    NotSupported,
    register,
    BaseSQLQueryRunner,
    TYPE_STRING,
    TYPE_BOOLEAN,
    TYPE_DATE,
    TYPE_DATETIME,
    TYPE_INTEGER,
    TYPE_FLOAT,
)
from redash.utils import json_dumps, json_loads
from redash import __version__

try:
    import pyodbc

    enabled = True
except ImportError:
    enabled = False


TYPES_MAP = {
    str: TYPE_STRING,
    bool: TYPE_BOOLEAN,
    datetime.date: TYPE_DATE,
    datetime.datetime: TYPE_DATETIME,
    int: TYPE_INTEGER,
    float: TYPE_FLOAT,
}


def _build_odbc_connection_string(**kwargs):
    return ";".join([f"{k}={v}" for k, v in kwargs.items()])


def split_sql_statements(query):
    def strip_trailing_comments(stmt):
        idx = len(stmt.tokens) - 1
        while idx >= 0:
            tok = stmt.tokens[idx]
            if tok.is_whitespace or sqlparse.utils.imt(tok, i=sqlparse.sql.Comment, t=sqlparse.tokens.Comment):
                stmt.tokens[idx] = sqlparse.sql.Token(sqlparse.tokens.Whitespace, ' ')
            else:
                break
            idx -= 1
        return stmt

    def strip_trailing_semicolon(stmt):
        idx = len(stmt.tokens) - 1
        while idx >= 0:
            tok = stmt.tokens[idx]
            # we expect that trailing comments already are removed
            if not tok.is_whitespace:
                if sqlparse.utils.imt(tok, t=sqlparse.tokens.Punctuation) and tok.value == ";":
                    stmt.tokens[idx] = sqlparse.sql.Token(sqlparse.tokens.Whitespace, ' ')
                break
            idx -= 1
        return stmt

    def is_empty_statement(stmt):
        strip_comments = sqlparse.filters.StripCommentsFilter()

        # copy statement object. `copy.deepcopy` fails to do this, so just re-parse it
        st = sqlparse.engine.FilterStack()
        stmt = next(st.run(sqlparse.text_type(stmt)))

        sql = sqlparse.text_type(strip_comments.process(stmt))
        return sql.strip() == ""

    stack = sqlparse.engine.FilterStack()

    result = [stmt for stmt in stack.run(query)]
    result = [strip_trailing_comments(stmt) for stmt in result]
    result = [strip_trailing_semicolon(stmt) for stmt in result]
    result = [sqlparse.text_type(stmt).strip() for stmt in result if not is_empty_statement(stmt)]

    if len(result) > 0:
        return result

    return [""]  # if all statements were empty - return a single empty statement


class Databricks(BaseSQLQueryRunner):
    noop_query = "SELECT 1"
    should_annotate_query = False

    @classmethod
    def type(cls):
        return "databricks"

    @classmethod
    def enabled(cls):
        return enabled

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "host": {"type": "string"},
                "http_path": {"type": "string", "title": "HTTP Path"},
                # We're using `http_password` here for legacy reasons
                "http_password": {"type": "string", "title": "Access Token"},
            },
            "order": ["host", "http_path", "http_password"],
            "secret": ["http_password"],
            "required": ["host", "http_path", "http_password"],
        }

    def _get_cursor(self):
        user_agent = "Redash/{} (Databricks)".format(__version__.split("-")[0])
        connection_string = _build_odbc_connection_string(
            Driver="Simba",
            UID="token",
            PORT="443",
            SSL="1",
            THRIFTTRANSPORT="2",
            SPARKSERVERTYPE="3",
            AUTHMECH=3,
            # Use the query as is without rewriting:
            UseNativeQuery="1",
            # Automatically reconnect to the cluster if an error occurs
            AutoReconnect="1",
            # Minimum interval between consecutive polls for query execution status (1ms)
            AsyncExecPollInterval="1",
            UserAgentEntry=user_agent,
            HOST=self.configuration["host"],
            PWD=self.configuration["http_password"],
            HTTPPath=self.configuration["http_path"],
        )

        connection = pyodbc.connect(connection_string, autocommit=True)
        return connection.cursor()

    def run_query(self, query, user):
        try:
            cursor = self._get_cursor()

            statements = split_sql_statements(query)
            for stmt in statements:
                cursor.execute(stmt)

            if cursor.description is not None:
                data = cursor.fetchall()
                columns = self.fetch_columns(
                    [
                        (i[0], TYPES_MAP.get(i[1], TYPE_STRING))
                        for i in cursor.description
                    ]
                )

                rows = [
                    dict(zip((column["name"] for column in columns), row))
                    for row in data
                ]

                data = {"columns": columns, "rows": rows}
                json_data = json_dumps(data)
                error = None
            else:
                error = None
                json_data = json_dumps(
                    {
                        "columns": [{"name": "result", "type": TYPE_STRING}],
                        "rows": [{"result": "No data was returned."}],
                    }
                )

            cursor.close()
        except pyodbc.Error as e:
            if len(e.args) > 1:
                error = str(e.args[1])
            else:
                error = str(e)
            json_data = None

        return json_data, error

    def get_schema(self):
        raise NotSupported()

    def get_databases(self):
        query = "SHOW DATABASES"
        results, error = self.run_query(query, None)

        if error is not None:
            raise Exception("Failed getting schema.")

        results = json_loads(results)

        first_column_name = results["columns"][0]["name"]
        return [row[first_column_name] for row in results["rows"]]

    def get_database_tables(self, database_name):
        schema = {}
        cursor = self._get_cursor()

        cursor.tables(schema=database_name)

        for table in cursor:
            table_name = "{}.{}".format(table[1], table[2])

            if table_name not in schema:
                schema[table_name] = {"name": table_name, "columns": []}

        return list(schema.values())

    def get_database_tables_with_columns(self, database_name):
        schema = {}
        cursor = self._get_cursor()

        # load tables first, otherwise tables without columns are not showed
        cursor.tables(schema=database_name)

        for table in cursor:
            table_name = "{}.{}".format(table[1], table[2])

            if table_name not in schema:
                schema[table_name] = {"name": table_name, "columns": []}

        cursor.columns(schema=database_name)

        for column in cursor:
            table_name = "{}.{}".format(column[1], column[2])

            if table_name not in schema:
                schema[table_name] = {"name": table_name, "columns": []}

            schema[table_name]["columns"].append({"name": column[3], "type": column[5]})

        return list(schema.values())

    def get_table_columns(self, database_name, table_name):
        cursor = self._get_cursor()
        cursor.columns(schema=database_name, table=table_name)
        return [{"name": column[3], "type": column[5]} for column in cursor]


register(Databricks)
