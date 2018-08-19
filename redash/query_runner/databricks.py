import base64
from .hive_ds import Hive 

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

    def __init__(self, configuration):
        super(DataBricks, self).__init__(configuration)

register(DataBricks)
