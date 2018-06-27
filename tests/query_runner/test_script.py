import os

from _pytest.monkeypatch import MonkeyPatch

from redash.query_runner.script import query_to_script_path
from tests import BaseTestCase


class TestQueryToScript(BaseTestCase):
    monkeypatch = MonkeyPatch()

    def test_unspecified(self):
        self.assertEqual("/foo/bar/baz.sh", query_to_script_path("*", "/foo/bar/baz.sh"))

    def test_specified(self):
        self.assertRaises(IOError, lambda: query_to_script_path("/foo/bar", "baz.sh"))

        self.monkeypatch.setattr(os.path, "exists", lambda x: True)
        self.assertEqual(["/foo/bar/baz.sh"], query_to_script_path("/foo/bar", "baz.sh"))
