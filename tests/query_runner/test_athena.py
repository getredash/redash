"""
Some test cases around the Athena/Glue catalog.
"""
from unittest import TestCase

import botocore
import mock
from botocore.stub import Stubber

from redash.query_runner.athena import Athena


class TestAthenaSchema(TestCase):
    def setUp(self):

        client = botocore.session.get_session().create_client(
            "athena",
            region_name="mars-east-1",
            aws_access_key_id="foo",
            aws_secret_access_key="bar",
        )
        self.stubber = Stubber(client)

        self.patcher = mock.patch("boto3.client")
        mocked_client = self.patcher.start()
        mocked_client.return_value = client

    def tearDown(self):
        self.patcher.stop()

    def test_external_table(self):
        """Unpartitioned table crawled through a JDBC connection"""
        query_runner = Athena({"schema_from_api": True, "region": "mars-east-1"})

        self.stubber.add_response(
            "list_databases",
            {"DatabaseList": [{"Name": "test1"}]},
            {"CatalogName": "AwsDataCatalog"},
        )
        self.stubber.add_response(
            "list_table_metadata",
            {
                "TableMetadataList": [
                    {
                        "Name": "jdbc_table",
                        "TableType": "EXTERNAL_TABLE",
                        "Columns": [{"Name": "row_id", "Type": "int", "Comment": ""}],
                        "PartitionKeys": [],
                        "Parameters": {},
                    }
                ]
            },
            {"CatalogName": "AwsDataCatalog", "DatabaseName": "test1"},
        )
        with self.stubber:
            assert query_runner.get_schema() == [
                {"columns": ["row_id"], "name": "test1.jdbc_table"}
            ]

    def test_partitioned_table(self):
        """
        Partitioned table
        """

        query_runner = Athena({"schema_from_api": True, "region": "mars-east-1"})

        self.stubber.add_response(
            "list_databases",
            {"DatabaseList": [{"Name": "test1"}]},
            {"CatalogName": "AwsDataCatalog"},
        )
        self.stubber.add_response(
            "list_table_metadata",
            {
                "TableMetadataList": [
                    {
                        "Name": "partitioned_table",
                        "TableType": "EXTERNAL_TABLE",
                        "Columns": [{"Name": "sk", "Type": "int"}],
                        "PartitionKeys": [{"Name": "category", "Type": "int"}],
                        "Parameters": {},
                    }
                ]
            },
            {"CatalogName": "AwsDataCatalog", "DatabaseName": "test1"},
        )
        with self.stubber:
            assert query_runner.get_schema() == [
                {"columns": ["sk", "category"], "name": "test1.partitioned_table"}
            ]

    def test_view(self):
        query_runner = Athena({"schema_from_api": True, "region": "mars-east-1"})

        self.stubber.add_response(
            "list_databases",
            {"DatabaseList": [{"Name": "test1"}]},
            {"CatalogName": "AwsDataCatalog"},
        )
        self.stubber.add_response(
            "list_table_metadata",
            {
                "TableMetadataList": [
                    {
                        "Name": "view",
                        "Columns": [{"Name": "sk", "Type": "int"}],
                        "PartitionKeys": [],
                        "TableType": "VIRTUAL_VIEW",
                        "Parameters": {"comment": "Presto View", "presto_view": "true"},
                    }
                ]
            },
            {"CatalogName": "AwsDataCatalog", "DatabaseName": "test1"},
        )
        with self.stubber:
            assert query_runner.get_schema() == [
                {"columns": ["sk"], "name": "test1.view"}
            ]

    def test_dodgy_table_does_not_break_schema_listing(self):
        """
        For some reason, not all Glue/Athena tables contain a "PartitionKeys" entry.

        This may be a Athena Catalog to Glue catalog migration issue.
        """
        query_runner = Athena({"schema_from_api": True, "region": "mars-east-1"})
        self.stubber.add_response(
            "list_databases",
            {"DatabaseList": [{"Name": "test1"}]},
            {"CatalogName": "AwsDataCatalog"},
        )
        self.stubber.add_response(
            "list_table_metadata",
            {
                "TableMetadataList": [
                    {
                        "Name": "csv",
                        "Columns": [{"Name": "region", "Type": "string"}],
                        "Parameters": {"classification": "csv"},
                    }
                ]
            },
            {"CatalogName": "AwsDataCatalog", "DatabaseName": "test1"},
        )
        with self.stubber:
            assert query_runner.get_schema() == [
                {"columns": ["region"], "name": "test1.csv"}
            ]

    def test_no_columns_table(self):
        """
        For some reason, not all Athena/Glue tables contain a "StorageDescriptor.Columns" entry.
        """
        query_runner = Athena({"schema_from_api": True, "region": "mars-east-1"})

        self.stubber.add_response(
            "list_databases",
            {"DatabaseList": [{"Name": "test1"}]},
            {"CatalogName": "AwsDataCatalog"},
        )
        self.stubber.add_response(
            "list_table_metadata",
            {
                "TableMetadataList": [
                    {
                        "Name": "no_column_table",
                        "PartitionKeys": [],
                        "TableType": "EXTERNAL_TABLE",
                        "Parameters": {"EXTERNAL": "TRUE"},
                    }
                ]
            },
            {"CatalogName": "AwsDataCatalog", "DatabaseName": "test1"},
        )
        with self.stubber:
            assert query_runner.get_schema() == []

    def test_non_default_catalog_table(self):
        """
        Not default (AwsDataCatalog) catalog
        """
        query_runner = Athena(
            {
                "schema_from_api": True,
                "region": "mars-east-1",
                "athena_data_source_name": "another",
            }
        )

        self.stubber.add_response(
            "list_databases",
            {"DatabaseList": [{"Name": "test1"}]},
            {"CatalogName": "another"},
        )
        self.stubber.add_response(
            "list_table_metadata",
            {
                "TableMetadataList": [
                    {
                        "Name": "table1",
                        "Columns": [{"Name": "id", "Type": "int"}],
                        "PartitionKeys": [{"Name": "dt", "Type": "string"}],
                        "TableType": "EXTERNAL_TABLE",
                        "Parameters": {"EXTERNAL": "TRUE"},
                    }
                ]
            },
            {"CatalogName": "another", "DatabaseName": "test1"},
        )
        with self.stubber:
            assert query_runner.get_schema() == [
                {"columns": ["id", "dt"], "name": "another.test1.table1"}
            ]
