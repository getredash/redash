"""
Some test cases around the Glue catalog.
"""
from unittest import TestCase

import botocore
import mock
from botocore.stub import Stubber

from redash.query_runner.athena import Athena


class TestGlueSchema(TestCase):
    def setUp(self):

        client = botocore.session.get_session().create_client(
            "glue",
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
        query_runner = Athena({"glue": True, "region": "mars-east-1"})

        self.stubber.add_response(
            "get_databases", {"DatabaseList": [{"Name": "test1"}]}, {}
        )
        self.stubber.add_response(
            "get_tables",
            {
                "TableList": [
                    {
                        "Name": "jdbc_table",
                        "StorageDescriptor": {
                            "Columns": [{"Name": "row_id", "Type": "int"}],
                            "Location": "Database.Schema.Table",
                            "Compressed": False,
                            "NumberOfBuckets": -1,
                            "SerdeInfo": {"Parameters": {}},
                            "BucketColumns": [],
                            "SortColumns": [],
                            "Parameters": {
                                "CrawlerSchemaDeserializerVersion": "1.0",
                                "CrawlerSchemaSerializerVersion": "1.0",
                                "UPDATED_BY_CRAWLER": "jdbc",
                                "classification": "sqlserver",
                                "compressionType": "none",
                                "connectionName": "jdbctest",
                                "typeOfData": "view",
                            },
                            "StoredAsSubDirectories": False,
                        },
                        "PartitionKeys": [],
                        "TableType": "EXTERNAL_TABLE",
                        "Parameters": {
                            "CrawlerSchemaDeserializerVersion": "1.0",
                            "CrawlerSchemaSerializerVersion": "1.0",
                            "UPDATED_BY_CRAWLER": "jdbc",
                            "classification": "sqlserver",
                            "compressionType": "none",
                            "connectionName": "jdbctest",
                            "typeOfData": "view",
                        },
                    }
                ]
            },
            {"DatabaseName": "test1"},
        )
        with self.stubber:
            assert query_runner.get_schema() == [
                {"columns": ["row_id"], "name": "test1.jdbc_table"}
            ]

    def test_partitioned_table(self):
        """
        Partitioned table as created by a GlueContext
        """

        query_runner = Athena({"glue": True, "region": "mars-east-1"})

        self.stubber.add_response(
            "get_databases", {"DatabaseList": [{"Name": "test1"}]}, {}
        )
        self.stubber.add_response(
            "get_tables",
            {
                "TableList": [
                    {
                        "Name": "partitioned_table",
                        "StorageDescriptor": {
                            "Columns": [{"Name": "sk", "Type": "int"}],
                            "Location": "s3://bucket/prefix",
                            "InputFormat": "org.apache.hadoop.mapred.TextInputFormat",
                            "OutputFormat": "org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat",
                            "Compressed": False,
                            "NumberOfBuckets": -1,
                            "SerdeInfo": {
                                "SerializationLibrary": "org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe",
                                "Parameters": {"serialization.format": "1"},
                            },
                            "BucketColumns": [],
                            "SortColumns": [],
                            "Parameters": {},
                            "SkewedInfo": {
                                "SkewedColumnNames": [],
                                "SkewedColumnValues": [],
                                "SkewedColumnValueLocationMaps": {},
                            },
                            "StoredAsSubDirectories": False,
                        },
                        "PartitionKeys": [{"Name": "category", "Type": "int"}],
                        "TableType": "EXTERNAL_TABLE",
                        "Parameters": {
                            "EXTERNAL": "TRUE",
                            "transient_lastDdlTime": "1537505313",
                        },
                    }
                ]
            },
            {"DatabaseName": "test1"},
        )
        with self.stubber:
            assert query_runner.get_schema() == [
                {"columns": ["sk", "category"], "name": "test1.partitioned_table"}
            ]

    def test_view(self):
        query_runner = Athena({"glue": True, "region": "mars-east-1"})

        self.stubber.add_response(
            "get_databases", {"DatabaseList": [{"Name": "test1"}]}, {}
        )
        self.stubber.add_response(
            "get_tables",
            {
                "TableList": [
                    {
                        "Name": "view",
                        "StorageDescriptor": {
                            "Columns": [{"Name": "sk", "Type": "int"}],
                            "Location": "",
                            "Compressed": False,
                            "NumberOfBuckets": 0,
                            "SerdeInfo": {},
                            "SortColumns": [],
                            "StoredAsSubDirectories": False,
                        },
                        "PartitionKeys": [],
                        "ViewOriginalText": "/* Presto View: ... */",
                        "ViewExpandedText": "/* Presto View */",
                        "TableType": "VIRTUAL_VIEW",
                        "Parameters": {"comment": "Presto View", "presto_view": "true"},
                    }
                ]
            },
            {"DatabaseName": "test1"},
        )
        with self.stubber:
            assert query_runner.get_schema() == [
                {"columns": ["sk"], "name": "test1.view"}
            ]

    def test_dodgy_table_does_not_break_schema_listing(self):
        """
        For some reason, not all Glue tables contain a "PartitionKeys" entry.

        This may be a Athena Catalog to Glue catalog migration issue.
        """
        query_runner = Athena({"glue": True, "region": "mars-east-1"})

        self.stubber.add_response(
            "get_databases", {"DatabaseList": [{"Name": "test1"}]}, {}
        )
        self.stubber.add_response(
            "get_tables",
            {
                "TableList": [
                    {
                        "Name": "csv",
                        "StorageDescriptor": {
                            "Columns": [{"Name": "region", "Type": "string"}],
                            "Location": "s3://bucket/files/",
                            "InputFormat": "org.apache.hadoop.mapred.TextInputFormat",
                            "Compressed": False,
                            "NumberOfBuckets": 0,
                            "SerdeInfo": {
                                "SerializationLibrary": "org.apache.hadoop.hive.serde2.lazy.LazySimpleSerDe",
                                "Parameters": {
                                    "field.delim": "|",
                                    "skip.header.line.count": "1",
                                },
                            },
                            "SortColumns": [],
                            "StoredAsSubDirectories": False,
                        },
                        "Parameters": {"classification": "csv"},
                    }
                ]
            },
            {"DatabaseName": "test1"},
        )
        with self.stubber:
            assert query_runner.get_schema() == [
                {"columns": ["region"], "name": "test1.csv"}
            ]
