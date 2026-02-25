from unittest import mock

from redash import settings
from tests import BaseTestCase


class TestAIGenerateQueryResource(BaseTestCase):
    def test_returns_501_when_llm_disabled(self):
        with mock.patch.object(settings, "LLM_ENABLED", False):
            rv = self.make_request(
                "post",
                "/api/ai/generate_query",
                data={"natural_language": "show all users"},
            )
        self.assertEqual(rv.status_code, 501)

    def test_returns_400_when_natural_language_missing(self):
        with mock.patch.object(settings, "LLM_ENABLED", True):
            rv = self.make_request(
                "post",
                "/api/ai/generate_query",
                data={},
            )
        self.assertEqual(rv.status_code, 400)

    def test_returns_400_when_natural_language_empty(self):
        with mock.patch.object(settings, "LLM_ENABLED", True):
            rv = self.make_request(
                "post",
                "/api/ai/generate_query",
                data={"natural_language": "   "},
            )
        self.assertEqual(rv.status_code, 400)

    def test_returns_query_when_llm_succeeds(self):
        mock_response = mock.Mock()
        mock_response.json.return_value = {
            "choices": [{"message": {"content": "SELECT * FROM users;"}}]
        }
        mock_response.raise_for_status = mock.Mock()

        with mock.patch.object(settings, "LLM_ENABLED", True), mock.patch.object(
            settings, "OPENAI_API_KEY", "test-key"
        ), mock.patch.object(settings, "OPENAI_BASE_URL", "https://api.openai.com/v1"), mock.patch.object(
            settings, "OPENAI_MODEL", "gpt-4o-mini"
        ), mock.patch(
            "requests.post", return_value=mock_response
        ):
            rv = self.make_request(
                "post",
                "/api/ai/generate_query",
                data={"natural_language": "show all users"},
            )

        self.assertEqual(rv.status_code, 200)
        self.assertEqual(rv.json["query"], "SELECT * FROM users;")

    def test_passes_schema_to_llm(self):
        captured_payload = {}

        def fake_post(url, json=None, headers=None, timeout=None):
            captured_payload.update(json or {})
            mock_response = mock.Mock()
            mock_response.json.return_value = {
                "choices": [{"message": {"content": "SELECT id FROM orders;"}}]
            }
            mock_response.raise_for_status = mock.Mock()
            return mock_response

        schema = [{"name": "orders", "columns": ["id", "amount"]}]

        with mock.patch.object(settings, "LLM_ENABLED", True), mock.patch.object(
            settings, "OPENAI_API_KEY", "test-key"
        ), mock.patch.object(settings, "OPENAI_BASE_URL", "https://api.openai.com/v1"), mock.patch.object(
            settings, "OPENAI_MODEL", "gpt-4o-mini"
        ), mock.patch(
            "requests.post", side_effect=fake_post
        ):
            rv = self.make_request(
                "post",
                "/api/ai/generate_query",
                data={"natural_language": "show all orders", "schema": schema},
            )

        self.assertEqual(rv.status_code, 200)
        user_message = captured_payload["messages"][1]["content"]
        self.assertIn("orders", user_message)

    def test_returns_500_when_llm_raises(self):
        with mock.patch.object(settings, "LLM_ENABLED", True), mock.patch.object(
            settings, "OPENAI_API_KEY", "test-key"
        ), mock.patch("requests.post", side_effect=Exception("network error")):
            rv = self.make_request(
                "post",
                "/api/ai/generate_query",
                data={"natural_language": "show all users"},
            )

        self.assertEqual(rv.status_code, 500)

    def test_requires_login(self):
        rv = self.make_request(
            "post",
            "/api/ai/generate_query",
            data={"natural_language": "show all users"},
            user=False,
        )
        self.assertIn(rv.status_code, [401, 302])
