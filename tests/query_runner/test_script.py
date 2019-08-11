import os
import subprocess

from _pytest.monkeypatch import MonkeyPatch

from redash.query_runner.script import query_to_script_path, run_script
from tests import BaseTestCase


class TestQueryToScript(BaseTestCase):
    monkeypatch = MonkeyPatch()

    def test_unspecified(self):
        self.assertEqual("/foo/bar/baz.sh", query_to_script_path("*", "/foo/bar/baz.sh"))

    def test_specified(self):
        self.assertRaises(IOError, lambda: query_to_script_path("/foo/bar", "baz.sh"))

        self.monkeypatch.setattr(os.path, "exists", lambda x: True)
        self.assertEqual(["/foo/bar/baz.sh"], query_to_script_path("/foo/bar", "baz.sh"))


class TestRunScript(BaseTestCase):
    monkeypatch = MonkeyPatch()

    def test_success(self):
        self.monkeypatch.setattr(subprocess, "check_output", lambda script, shell: "test")
        self.assertEqual(("test", None), run_script("/foo/bar/baz.sh", True))

    def test_failure(self):
        self.monkeypatch.setattr(subprocess, "check_output", lambda script, shell: None)
        self.assertEqual((None, "Error reading output"), run_script("/foo/bar/baz.sh", True))
        self.monkeypatch.setattr(subprocess, "check_output", lambda script, shell: "")
        self.assertEqual((None, "Empty output from script"), run_script("/foo/bar/baz.sh", True))
        self.monkeypatch.setattr(subprocess, "check_output", lambda script, shell: " ")
        self.assertEqual((None, "Empty output from script"), run_script("/foo/bar/baz.sh", True))
