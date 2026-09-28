from werkzeug.datastructures import MultiDict

from redash.handlers.setup import SetupForm
from tests import BaseTestCase


class TestSetupForm(BaseTestCase):
    def _form(self, email):
        data = {"name": "Admin", "email": email, "password": "secret1", "org_name": "Org"}
        with self.app.test_request_context():
            form = SetupForm(MultiDict(data))
            return form.validate(), form.errors

    def test_valid_email(self):
        self.assertEqual((True, {}), self._form("admin@example.com"))

    def test_invalid_email(self):
        valid, errors = self._form("not-an-email")
        self.assertFalse(valid)
        self.assertIn("email", errors)
