from unittest import TestCase, mock

from redash.query_runner import with_ssh_tunnel
from redash.query_runner.pg import PostgreSQL, _parse_dsn, build_schema


class TestParameters(TestCase):
    def test_parse_dsn(self):
        configuration = {"dsn": "application_name=redash connect_timeout=5"}
        self.assertDictEqual(_parse_dsn(configuration), {"application_name": "redash", "connect_timeout": "5"})

    def test_parse_dsn_not_permitted(self):
        configuration = {"dsn": "password=xyz"}
        self.assertRaises(ValueError, _parse_dsn, configuration)


class TestBuildSchema(TestCase):
    def test_handles_dups_between_public_and_other_schemas(self):
        results = {
            "rows": [
                {
                    "table_schema": "public",
                    "table_name": "main.users",
                    "column_name": "id",
                },
                {"table_schema": "main", "table_name": "users", "column_name": "id"},
                {"table_schema": "main", "table_name": "users", "column_name": "name"},
            ]
        }

        schema = {}

        build_schema(results, schema)

        self.assertIn("main.users", schema.keys())
        self.assertListEqual(schema["main.users"]["columns"], ["id", "name"])
        self.assertIn('public."main.users"', schema.keys())
        self.assertListEqual(schema['public."main.users"']["columns"], ["id"])

    def test_build_schema_with_data_types(self):
        results = {
            "rows": [
                {"table_schema": "main", "table_name": "users", "column_name": "id", "data_type": "integer"},
                {"table_schema": "main", "table_name": "users", "column_name": "name", "data_type": "varchar"},
            ]
        }

        schema = {}

        build_schema(results, schema)

        self.assertListEqual(
            schema["main.users"]["columns"], [{"name": "id", "type": "integer"}, {"name": "name", "type": "varchar"}]
        )


class TestAwsIamAuth(TestCase):
    def setUp(self):
        self.query_runner = PostgreSQL(
            {
                "host": "db.xxx.ap-northeast-1.rds.amazonaws.com",
                "port": 5432,
                "user": "redash",
                "dbname": "redash",
                "awsIamAuth": True,
                "awsRegion": "ap-northeast-1",
            }
        )

    @mock.patch("redash.query_runner.pg.IAM_ENABLED", True)
    @mock.patch("redash.query_runner.pg.boto3", create=True)
    @mock.patch("redash.query_runner.pg.psycopg2.connect")
    def test_signs_token_for_configured_endpoint(self, connect, boto3):
        boto3.client.return_value.generate_db_auth_token.return_value = "token"

        self.query_runner._get_connection()

        boto3.client.assert_called_once_with("rds", region_name="ap-northeast-1")
        boto3.client.return_value.generate_db_auth_token.assert_called_once_with(
            DBHostname="db.xxx.ap-northeast-1.rds.amazonaws.com", Port=5432, DBUsername="redash"
        )
        _, kwargs = connect.call_args
        self.assertEqual(kwargs["host"], "db.xxx.ap-northeast-1.rds.amazonaws.com")
        self.assertEqual(kwargs["port"], 5432)
        self.assertEqual(kwargs["password"], "token")

    @mock.patch("redash.query_runner.pg.IAM_ENABLED", True)
    @mock.patch("redash.query_runner.pg.boto3", create=True)
    @mock.patch("redash.query_runner.pg.psycopg2.connect")
    @mock.patch("redash.query_runner.open_tunnel")
    def test_signs_token_for_remote_endpoint_through_ssh_tunnel(self, open_tunnel, connect, boto3):
        open_tunnel.return_value.__enter__.return_value.local_bind_address = ("127.0.0.1", 12345)
        boto3.client.return_value.generate_db_auth_token.return_value = "token"

        self.query_runner.run_query = lambda query, user: self.query_runner._get_connection()
        with_ssh_tunnel(self.query_runner, {"ssh_host": "bastion.example.com", "ssh_username": "ec2-user"})
        self.query_runner.run_query("SELECT 1", None)

        boto3.client.assert_called_once_with("rds", region_name="ap-northeast-1")
        boto3.client.return_value.generate_db_auth_token.assert_called_once_with(
            DBHostname="db.xxx.ap-northeast-1.rds.amazonaws.com", Port=5432, DBUsername="redash"
        )
        _, kwargs = connect.call_args
        self.assertEqual(kwargs["host"], "127.0.0.1")
        self.assertEqual(kwargs["port"], 12345)
        self.assertFalse(hasattr(self.query_runner, "_ssh_tunnel_remote_address"))

    @mock.patch("redash.query_runner.pg.IAM_ENABLED", True)
    @mock.patch("redash.query_runner.pg.boto3", create=True)
    @mock.patch("redash.query_runner.pg._get_ssl_config")
    def test_does_not_create_ssl_files_when_token_generation_fails(self, get_ssl_config, boto3):
        boto3.client.return_value.generate_db_auth_token.side_effect = Exception("NoCredentialsError")

        with self.assertRaises(Exception):
            self.query_runner._get_connection()

        get_ssl_config.assert_not_called()

    @mock.patch("redash.query_runner.pg.IAM_ENABLED", True)
    @mock.patch("redash.query_runner.pg.boto3", create=True)
    @mock.patch("redash.query_runner.pg.psycopg2.connect")
    def test_uses_default_port_for_both_signing_and_connecting_when_port_is_omitted(self, connect, boto3):
        del self.query_runner.configuration["port"]

        self.query_runner._get_connection()

        boto3.client.return_value.generate_db_auth_token.assert_called_once_with(
            DBHostname="db.xxx.ap-northeast-1.rds.amazonaws.com", Port=5432, DBUsername="redash"
        )
        _, kwargs = connect.call_args
        self.assertEqual(kwargs["port"], 5432)

    @mock.patch("redash.query_runner.pg.psycopg2.connect")
    def test_leaves_omitted_port_to_libpq_without_iam_auth(self, connect):
        self.query_runner.configuration["awsIamAuth"] = False
        del self.query_runner.configuration["port"]

        self.query_runner._get_connection()

        _, kwargs = connect.call_args
        self.assertIsNone(kwargs["port"])
