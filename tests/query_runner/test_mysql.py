from unittest import TestCase

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
