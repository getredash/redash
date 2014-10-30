import unittest
from redash.query_runner import Configuration, ConfigurationField, ConfigurationError


class TestConfigurationParsing(unittest.TestCase):
    def test_parse_raises_error_when_missing_mandatory_fields(self):
        configuration = Configuration([ConfigurationField("dbname", mandatory=True)])
        self.assertRaises(ConfigurationError, configuration.parse, {})

    def test_parse_returns_value_when_correct(self):
        configuration = Configuration([ConfigurationField("dbname", mandatory=True)])
        self.assertDictEqual(configuration.parse({"dbname":"test"}), {"dbname":"test"})