import unittest

from redash.query_runner.azure_kusto import AzureKusto

class TestAzureKustoQueryRunner(unittest.TestCase):
    def setUp(self):
        self.query_runner = AzureKusto({})

if __name__ == "__main__":
    unittest.main()