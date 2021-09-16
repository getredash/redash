import functools
from urllib.parse import urlparse
import json
import os
import boto3
import sqlalchemy


ASSETDB_AWS_RDS_CA_BUNDLE = os.environ.get(
    "ASSETDB_AWS_RDS_CA_BUNDLE", "/app/rds-combined-ca-bundle.pem"
)
REDASH_DASHBOARD_JSON_PATH = os.environ.get(
    "REDASH_DASHBOARD_JSON_PATH", "/app/redash.json"
)


def get_iam_token(username, hostname, port):
    return boto3.client("rds").generate_db_auth_token(
        DBHostname=hostname,
        Port=port,
        DBUsername=username,
        Region=os.environ.get("AWS_REGION"),
    )


def get_iam_auth(username, hostname, port):
    dsn = {}
    dsn["user"] = username
    dsn["password"] = get_iam_token(username, hostname, port)
    dsn["sslmode"] = "verify-full"
    dsn["sslrootcert"] = ASSETDB_AWS_RDS_CA_BUNDLE
    return dsn


def create_do_connect_handler(url):
    def handler(dialect, conn_rec, cargs, cparams):
        _, connect_params = dialect.create_connect_args(url)
        creds = get_iam_auth(url.username, url.host, url.port)
        connect_params.update(creds)
        cparams.update(connect_params)

    return handler


def get_db(dburi, dbcreds=None, disable_iam_auth=False):
    """get_db will attempt to create an engine for the given dburi

    dbcreds (optional) AWS Secrets Manager ARN to load a {user: .., password: ..} JSON credential
    disable_iam_auth (optional, default: False) disable attempts to perform IAM auth
    """
    url = sqlalchemy.engine.url.make_url(dburi)
    iam_auth = url.query.get("iam_auth")
    url = sqlalchemy.engine.url.make_url(str(url).split("?")[0])
    params = {"json_serializer": json.dumps}

    if not disable_iam_auth and iam_auth == "true":
        backend = url.get_backend_name()
        engine = sqlalchemy.create_engine(f"{backend}://", **params)
        sqlalchemy.event.listen(engine, "do_connect", create_do_connect_handler(url))
        return engine
    elif dbcreds:
        creds = get_db_cred_secret(dbcreds)
        url = url.set(username=creds.get("user"), password=creds.get("password"))
    engine = sqlalchemy.create_engine(url, **params)
    return engine


def get_env_db():
    return get_db(
        dburi=os.environ.get("ASSETDB_DATABASE_URI"),
        dbcreds=os.environ.get("ASSETDB_DBCRED_ARN"),
    )


def get_db_cred_secret(dbcreds):
    client = boto3.client("secretsmanager")
    secret = client.get_secret_value(SecretId=dbcreds)
    return json.loads(secret["SecretString"])


def parse_iam_auth(host):
    """parse_iam_auth: parses the host and returns (True, host)
    if the iam_auth=true query parameter is found."""
    parsed_url = urlparse(host)
    return "iam_auth=true" in parsed_url.query, parsed_url.path


def inject_iam_auth(func):
    """inject_iam_auth: will look for the query string ?iam_auth=True in the connection URL.
    If found, the configuration password will be replaced with one generated via
    AWS RDS generate token call."""

    @functools.wraps(func)
    def wrapped_connection(*args, **kwargs):
        self = args[0]
        host = self.configuration.get("host")
        should_use_iam, iam_host = parse_iam_auth(host)

        if should_use_iam:
            self.configuration["host"] = iam_host
            self.configuration["password"] = get_iam_token(
                self.configuration.get("user"), iam_host, self.configuration.get("port")
            )

        return func(*args, **kwargs)

    return wrapped_connection
