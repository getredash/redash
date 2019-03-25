from mock import patch
from tests import BaseTestCase

from redash.query_runner.big_query import BigQuery


class TestBigQuery(BaseTestCase):
    def test_get_table_sample_returns_expected_result(self):
        SAMPLES_RESPONSE = {
            "rows": [
                {
                    "f": [
                        {"v": "2017-10-28"},
                        {"v": "2019-03-28T18:57:04.485091"},
                        {"v": "3341"},
                        {"v": "2451"},
                        {"v": "Iran"},
                    ]
                }
            ]
        }

        SCHEMA_RESPONSE = {
            "id": "project:dataset.table",
            "schema": {
                "fields": [
                    {"type": "DATE", "name": "submission_date", "mode": "NULLABLE"},
                    {"type": "DATETIME", "name": "generated_time", "mode": "NULLABLE"},
                    {"type": "INTEGER", "name": "mau", "mode": "NULLABLE"},
                    {"type": "INTEGER", "name": "wau", "mode": "NULLABLE"},
                    {"type": "STRING", "name": "country", "mode": "NULLABLE"},
                ]
            },
        }

        EXPECTED_SAMPLES_DICT = {
            "submission_date": "2017-10-28",
            "country": "Iran",
            "wau": "2451",
            "mau": "3341",
            "generated_time": "2019-03-28T18:57:04.485091",
        }

        with patch.object(BigQuery, "_get_bigquery_service") as get_bq_service:
            tabledata_list = get_bq_service.return_value.tabledata.return_value.list
            tabledata_list.return_value.execute.return_value = SAMPLES_RESPONSE

            tables_get = get_bq_service.return_value.tables.return_value.get
            tables_get.return_value.execute.return_value = SCHEMA_RESPONSE

            query_runner = BigQuery({"loadSchema": True, "projectId": "test_project"})
            table_sample = query_runner.get_table_sample("dataset.table")

            self.assertEqual(table_sample, EXPECTED_SAMPLES_DICT)
