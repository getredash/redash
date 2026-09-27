from unittest import TestCase
from unittest.mock import patch

from sqlalchemy.pool import NullPool

from redash.models.base import engine_options


class TestEngineOptions(TestCase):
    def test_defaults(self):
        options = engine_options()
        self.assertNotIn("pool_size", options)
        self.assertNotIn("max_overflow", options)
        self.assertNotIn("pool_pre_ping", options)
        self.assertNotIn("poolclass", options)

    @patch.multiple(
        "redash.settings",
        SQLALCHEMY_POOL_SIZE=7,
        SQLALCHEMY_MAX_OVERFLOW=3,
        SQLALCHEMY_ENABLE_POOL_PRE_PING=True,
    )
    def test_pool_settings(self):
        options = engine_options()
        self.assertEqual(7, options["pool_size"])
        self.assertEqual(3, options["max_overflow"])
        self.assertTrue(options["pool_pre_ping"])

    @patch.multiple("redash.settings", SQLALCHEMY_DISABLE_POOL=True, SQLALCHEMY_POOL_SIZE=7, SQLALCHEMY_MAX_OVERFLOW=3)
    def test_disabled_pool(self):
        options = engine_options()
        self.assertIs(NullPool, options["poolclass"])
        # NullPool doesn't accept pool sizing options.
        self.assertNotIn("pool_size", options)
        self.assertNotIn("max_overflow", options)
