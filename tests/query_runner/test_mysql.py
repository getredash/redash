from unittest import TestCase

import jsonschema
import mock

from redash.query_runner.mysql import Mysql, RDSMySQL


class TestMysqlTimeouts(TestCase):
    def test_schema_exposes_read_and_write_timeouts(self):
        schema = Mysql.configuration_schema()
        self.assertIn("read_timeout", schema["properties"])
        self.assertIn("write_timeout", schema["properties"])
        self.assertIn("read_timeout", schema["order"])
        self.assertIn("write_timeout", schema["order"])

        rds_schema = RDSMySQL.configuration_schema()
        self.assertIn("read_timeout", rds_schema["properties"])
        self.assertIn("write_timeout", rds_schema["properties"])

    def test_connection_omits_timeouts_when_unset(self):
        runner = Mysql({"db": "app"})
        with mock.patch("redash.query_runner.mysql.MySQLdb", create=True) as mysql:
            runner._connection()
            params = mysql.connect.call_args[1]
            self.assertNotIn("read_timeout", params)
            self.assertNotIn("write_timeout", params)

    def test_connection_forwards_configured_timeouts(self):
        runner = Mysql({"db": "app", "read_timeout": 30, "write_timeout": 15})
        with mock.patch("redash.query_runner.mysql.MySQLdb", create=True) as mysql:
            runner._connection()
            params = mysql.connect.call_args[1]
            self.assertEqual(params["read_timeout"], 30)
            self.assertEqual(params["write_timeout"], 15)

    def test_timeout_schemas_reject_unsupported_values(self):
        for runner in (Mysql, RDSMySQL):
            for name in ("read_timeout", "write_timeout"):
                schema = runner.configuration_schema()["properties"][name]
                for value in (-1, 0.5, 2147483648, True, "30"):
                    with self.subTest(runner=runner, name=name, value=value):
                        with self.assertRaises(jsonschema.ValidationError):
                            jsonschema.validate(value, schema)
                for value in (0, 1, 30, 2147483647):
                    jsonschema.validate(value, schema)

    def test_connection_normalizes_integral_json_numbers(self):
        runner = Mysql({"db": "app", "read_timeout": 30.0, "write_timeout": 0.0})
        with mock.patch("redash.query_runner.mysql.MySQLdb", create=True) as mysql:
            runner._connection()
            params = mysql.connect.call_args[1]
            self.assertIs(type(params["read_timeout"]), int)
            self.assertIs(type(params["write_timeout"]), int)
            self.assertEqual(params["read_timeout"], 30)
            self.assertEqual(params["write_timeout"], 0)
