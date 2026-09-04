import logging

from redash.query_runner import BaseCacheQueryRunner, register

logger = logging.getLogger(__name__)

try:
    from pymemcache.client.base import PooledClient
    from pymemcache.client.hash import HashClient

    enabled = True

except ImportError:
    enabled = False


class Memcached(BaseCacheQueryRunner):
    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "host": {"type": "string", "title": "Memcached Host"},
                "port": {"type": "string", "title": "Memcached Port"},
                "max_pool_size": {"type": "integer", "title": "Max Pool Size"},
                "is_cluster": {"type": "boolean", "title": "Is Cluster"},
                "ai_prompt": {"type": "textarea", "title": "Data source description"},
            },
            "order": ["host", "port", "max_pool_size", "ai_prompt", "is_cluster"],
            "extra_options": ["max_pool_size", "ai_prompt", "is_cluster"],
        }

    def _get_db(self):
        connectionDetails = (self.configuration["host"] or "0.0.0.0", int(self.configuration["port"] or 11211))

        try:
            if self.configuration.get("is_cluster"):
                return HashClient([connectionDetails])

            return PooledClient(connectionDetails, max_pool_size=self.configuration.get("max_pool_size", 10))
        except Exception as e:
            logger.exception(f"Failed to connect to Memcached: {e}")
            return None

    def run_query(self, query, user=None):
        result = super(Memcached, self).run_query(query, user)

        if result["cmd"] == "GET":
            columns = ["key", "value"]
            rows = [{"key": result["key"] if result["key"] else result["cmd"], "value": result["value"] or ""}]
        else:
            columns = ["operation"]
            rows = [{"operation": result["cmd"]}]

        return {"columns": columns, "rows": rows}, result["error"]

    def test_connection(self):
        super(Memcached, self).test_connection()

        _, error = self.run_query("set test_connection_key test_connection_value")
        if error:
            raise Exception(f"Failed to set test connection key: {error}")

        results, error = self.run_query("get test_connection_key")
        if error:
            raise Exception(f"Failed to get test connection key: {error}")
        elif results["rows"][0]["value"] != "test_connection_value":
            raise Exception("Test connection key returned unexpected value")

        _, error = self.run_query("delete test_connection_key")
        if error:
            raise Exception(f"Failed to delete test connection key: {error}")


register(Memcached)
