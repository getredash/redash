import logging
import os
import sys

from redash import extensions
from tests import BaseTestCase

logger = logging.getLogger(__name__)
dummy_extension = "redash-dummy"
dummy_path = os.path.join(os.path.dirname(__file__), dummy_extension)


class TestExtensions(BaseTestCase):
    @classmethod
    def setUpClass(cls):
        sys.path.insert(0, dummy_path)

    @classmethod
    def tearDownClass(cls):
        sys.path.remove(dummy_path)

    def test_working_extension(self):
        self.assertIn("working_extension", extensions.extensions.keys())
        self.assertEqual(
            extensions.extensions.get("working_extension"), "extension loaded"
        )

    def test_assertive_extension(self):
        self.assertNotIn("assertive_extension", extensions.extensions.keys())

    def test_not_findable_extension(self):
        self.assertNotIn("not_findable_extension", extensions.extensions.keys())

    def test_not_importable_extension(self):
        self.assertNotIn("not_importable_extension", extensions.extensions.keys())

    def test_non_callable_extension(self):
        self.assertNotIn("non_callable_extension", extensions.extensions.keys())

    def test_dummy_periodic_task(self):
        # need to load the periodic tasks manually since this isn't
        # done automatically on test suite start but only part of
        # the worker configuration
        extensions.load_periodic_tasks(logger)
        self.assertIn("dummy_periodic_task", extensions.periodic_tasks.keys())
