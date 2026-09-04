from redash.query_runner import register
from redash.query_runner.pg import PostgreSQL


class RisingWave(PostgreSQL):
    @classmethod
    def type(cls):
        return "risingwave"

    @classmethod
    def name(cls):
        return "RisingWave"

    def _get_tables(self, schema):
        query = """
        SELECT s.nspname as table_schema,
               c.relname as table_name,
               a.attname as column_name,
               null as data_type
        FROM pg_class c
        JOIN pg_namespace s
        ON c.relnamespace = s.oid
        AND s.nspname NOT IN ('pg_catalog', 'information_schema', 'rw_catalog')
        JOIN pg_attribute a
        ON a.attrelid = c.oid
        AND a.attnum > 0
        AND NOT a.attisdropped
        WHERE c.relkind IN ('m', 'f', 'p')

        UNION

        SELECT table_schema,
               table_name,
               column_name,
               data_type
        FROM information_schema.columns
        WHERE table_schema NOT IN ('pg_catalog', 'information_schema', 'rw_catalog');
        """

        self._get_definitions(schema, query)

        return list(schema.values())


register(RisingWave)
