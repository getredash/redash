import datetime
from unittest import TestCase

from redash.query_runner.ignite import Ignite


class TestIgnite(TestCase):
    def test_server_to_connection(self):
        config = {
            "server": "localhost,localhost:10801,invalid:port:100",
        }
        ignite = Ignite(config)

        server = ignite.configuration.get("server", "127.0.0.1:10800")

        server_list = [ignite.server_to_connection(s) for s in server.split(",")]

        self.assertTupleEqual(server_list[0], ("localhost", 10800))
        self.assertTupleEqual(server_list[1], ("localhost", 10801))
        self.assertTupleEqual(server_list[2], ("unknown", 10800))

    def test_normalise_row(self):
        config = {
            "server": "localhost,localhost:10801,invalid:port:100",
        }
        ignite = Ignite(config)

        row = [1, 1.0, "string", True, datetime.datetime(2014, 10, 3, 0, 0), (datetime.datetime(2014, 10, 3, 0, 0), 0)]

        converted = ignite.normalise_row(row)

        self.assertListEqual(
            converted,
            [1, 1.0, "string", True, datetime.datetime(2014, 10, 3, 0, 0), datetime.datetime(2014, 10, 3, 0, 0)],
        )

    def test_parse_query_results(self):
        config = {
            "server": "localhost,localhost:10801,invalid:port:100",
        }
        ignite = Ignite(config)

        results = ignite._parse_results(
            iter([["col1", "col2", "col3", "col4"], [1, 2.0, "three", (datetime.datetime(2014, 10, 3, 0, 0), 0)]])
        )

        self.assertListEqual(
            results[0],
            [
                {"name": "col1", "friendly_name": "col1"},
                {"name": "col2", "friendly_name": "col2"},
                {"name": "col3", "friendly_name": "col3"},
                {"name": "col4", "friendly_name": "col4"},
            ],
        )
        self.assertListEqual(
            results[1],
            [
                {"col1": 1, "col2": 2.0, "col3": "three", "col4": datetime.datetime(2014, 10, 3, 0, 0)},
            ],
        )
