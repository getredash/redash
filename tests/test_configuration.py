from unittest import TestCase

from jsonschema import ValidationError

from redash.utils.configuration import ConfigurationContainer


configuration_schema = {
    "type": "object",
    "properties": {
        "a": {
            "type": "integer"
        },
        "e": {
            "type": "integer"
        },
        "b": {
            "type": "string"
        }
    },
    "required": ["a"],
    "secret": ["b"]
}


class TestConfigurationToJson(TestCase):
    def setUp(self):
        self.config = {'a': 1, 'b': 'test'}
        self.container = ConfigurationContainer(self.config, configuration_schema)

    def test_returns_plain_dict(self):
        self.assertDictEqual(self.config, self.container.to_dict())

    def test_raises_exception_when_no_schema_set(self):
        self.container.set_schema(None)
        self.assertRaises(RuntimeError, lambda: self.container.to_dict(mask_secrets=True))

    def test_returns_dict_with_masked_secrets(self):
        d = self.container.to_dict(mask_secrets=True)

        self.assertEqual(d['a'], self.config['a'])
        self.assertNotEqual(d['b'], self.config['b'])

        self.assertEqual(self.config['b'], self.container['b'])


class TestConfigurationUpdate(TestCase):
    def setUp(self):
        self.config = {'a': 1, 'b': 'test'}
        self.container = ConfigurationContainer(self.config, configuration_schema)

    def test_rejects_invalid_new_config(self):
        self.assertRaises(ValidationError, lambda: self.container.update({'c': 3}))

    def test_fails_if_no_schema_set(self):
        self.container.set_schema(None)
        self.assertRaises(RuntimeError, lambda: self.container.update({'c': 3}))

    def test_ignores_secret_placehodler(self):
        self.container.update(self.container.to_dict(mask_secrets=True))
        self.assertEqual(self.container['b'], self.config['b'])

    def test_updates_secret(self):
        new_config = {'a': 2, 'b': 'new'}
        self.container.update(new_config)
        self.assertDictEqual(self.container._config, new_config)

    def test_doesnt_leave_leftovers(self):
        container = ConfigurationContainer({'a': 1, 'b': 'test', 'e': 3}, configuration_schema)
        new_config = container.to_dict(mask_secrets=True)
        new_config.pop('e')
        container.update(new_config)

        self.assertEqual(container['a'], 1)
        self.assertEqual('test', container['b'])
        self.assertNotIn('e', container)

    def test_works_for_schema_without_secret(self):
        secretless = configuration_schema.copy()
        secretless.pop('secret')
        container = ConfigurationContainer({'a': 1, 'b': 'test', 'e': 3}, secretless)
        container.update({'a': 2})
        self.assertEqual(container['a'], 2)
