import io
from unittest import TestCase

import mock
import pandas as pd

from redash.query_runner.csv import CSV
from redash.query_runner.excel import Excel

CSV_CONTENT = (
    b"name,count,ratio,created_at,active\nalice,1,1.5,2020-01-01 10:00:00,true\n,2,,2020-01-02 11:00:00,false\n"
)

EXPECTED_COLUMNS = [
    ("name", "string"),
    ("count", "integer"),
    ("ratio", "float"),
    ("created_at", "datetime"),
    ("active", "boolean"),
]
EXPECTED_ROWS = [
    {"name": "alice", "count": 1, "ratio": 1.5, "created_at": "2020-01-01 10:00:00", "active": True},
    {"name": None, "count": 2, "ratio": None, "created_at": "2020-01-02 11:00:00", "active": False},
]


def xlsx_content():
    df = pd.read_csv(io.BytesIO(CSV_CONTENT), parse_dates=["created_at"])
    buffer = io.BytesIO()
    df.to_excel(buffer, index=False)
    return buffer.getvalue()


class RunnerTestMixin:
    runner_class = None
    module = None
    query = "url: https://example.com/data"

    def run_with_content(self, content):
        with mock.patch("redash.query_runner.{}.requests_or_advocate.get".format(self.module)) as get:
            get.return_value.content = content
            return self.runner_class({}).run_query(self.query, None)

    def assert_result(self, data, error):
        self.assertIsNone(error)
        self.assertEqual(EXPECTED_COLUMNS, [(c["name"], c["type"]) for c in data["columns"]])
        self.assertEqual(EXPECTED_ROWS, data["rows"])


class TestCSV(RunnerTestMixin, TestCase):
    runner_class = CSV
    module = "csv"
    query = "url: https://example.com/data.csv\nparse_dates: [created_at]"

    def test_run_query(self):
        self.assert_result(*self.run_with_content(CSV_CONTENT))


class TestExcel(RunnerTestMixin, TestCase):
    runner_class = Excel
    module = "excel"
    query = "url: https://example.com/data.xlsx"

    def test_run_query(self):
        self.assert_result(*self.run_with_content(xlsx_content()))
