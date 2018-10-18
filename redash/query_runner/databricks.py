import base64
from .hive_ds import Hive
from redash.query_runner import register

try:
    from pyhive import hive
    from thrift.transport import THttpClient
    enabled = True
except ImportError:
    enabled = False


class DataBricks(Hive):

    @classmethod
    def type(cls):
        return "databricks"

    @classmethod
    def enabled(cls):
        return enabled


register(DataBricks)
