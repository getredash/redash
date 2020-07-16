import logging
import shutil
import subprocess
import sys
from pathlib import Path

from redash import extensions
from redash.tasks import periodic_job_definitions
from tests import BaseTestCase

logger = logging.getLogger(__name__)
dummy_extension = "redash-dummy"

this_dir = Path(__file__).parent.resolve()
app_dir = this_dir.parent.parent
dummy_path = str(this_dir / dummy_extension)
test_bundle = (
    app_dir / "client" / "app" / "extensions" / "wide_footer" / "WideFooter.jsx"
)


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
        extensions.load_periodic_jobs(logger)
        self.assertIn("dummy_periodic_job", extensions.periodic_jobs.keys())

    def test_dummy_periodic_task_definitions(self):
        jobs = periodic_job_definitions()
        from redash_dummy.jobs import job_callback

        self.assertIn(job_callback, [job.get("func", None) for job in jobs])


class TestBundles(BaseTestCase):
    @classmethod
    def setUpClass(cls):
        # Install the redash-dummy package temporarily using pip
        # in the user's local site package directory under ~/.local/
        subprocess.call(["pip", "install", "--user", dummy_path])

    @classmethod
    def tearDownClass(cls):
        subprocess.call(["pip", "uninstall", "-y", "redash-dummy"])

    def test_bundle_extensions(self):
        # cleaning up after running bundle-extensions again
        self.addCleanup(lambda: shutil.rmtree(test_bundle.parent))
        assert not test_bundle.exists()
        subprocess.run(str(app_dir / "bin" / "bundle-extensions"), check=True)
        assert test_bundle.exists()
