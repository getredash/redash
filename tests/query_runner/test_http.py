import mock
from unittest import TestCase

import requests
from redash.query_runner import BaseHTTPQueryRunner


class RequiresAuthQueryRunner(BaseHTTPQueryRunner):
    requires_authentication = True


class TestBaseHTTPQueryRunner(TestCase):
    def test_requires_authentication_default(self):
        self.assertFalse(BaseHTTPQueryRunner.requires_authentication)
        schema = BaseHTTPQueryRunner.configuration_schema()
        self.assertNotIn("username", schema["required"])
        self.assertNotIn("password", schema["required"])

    def test_requires_authentication_true(self):
        schema = RequiresAuthQueryRunner.configuration_schema()
        self.assertIn("username", schema["required"])
        self.assertIn("password", schema["required"])

    def test_get_auth_with_values(self):
        query_runner = BaseHTTPQueryRunner(
            {"username": "username", "password": "password"}
        )
        self.assertEqual(query_runner.get_auth(), ("username", "password"))

    def test_get_auth_empty(self):
        query_runner = BaseHTTPQueryRunner({})
        self.assertIsNone(query_runner.get_auth())

    def test_get_auth_empty_requires_authentication(self):
        query_runner = RequiresAuthQueryRunner({})
        self.assertRaisesRegex(
            ValueError, "Username and Password required", query_runner.get_auth
        )

    @mock.patch("requests.request")
    def test_get_response_success(self, mock_get):
        mock_response = mock.Mock()
        mock_response.status_code = 200
        mock_response.text = "Success"
        mock_get.return_value = mock_response

        url = "https://example.com/"
        query_runner = BaseHTTPQueryRunner({})
        response, error = query_runner.get_response(url)
        mock_get.assert_called_once_with("get", url, auth=None)
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(error)

    @mock.patch("requests.request")
    def test_get_response_success_custom_auth(self, mock_get):
        mock_response = mock.Mock()
        mock_response.status_code = 200
        mock_response.text = "Success"
        mock_get.return_value = mock_response

        url = "https://example.com/"
        query_runner = BaseHTTPQueryRunner({})
        auth = ("username", "password")
        response, error = query_runner.get_response(url, auth=auth)
        mock_get.assert_called_once_with("get", url, auth=auth)
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(error)

    @mock.patch("requests.request")
    def test_get_response_failure(self, mock_get):
        mock_response = mock.Mock()
        mock_response.status_code = 301
        mock_response.text = "Redirect"
        mock_get.return_value = mock_response

        url = "https://example.com/"
        query_runner = BaseHTTPQueryRunner({})
        response, error = query_runner.get_response(url)
        mock_get.assert_called_once_with("get", url, auth=None)
        self.assertIn(query_runner.response_error, error)

    @mock.patch("requests.request")
    def test_get_response_httperror_exception(self, mock_get):
        mock_response = mock.Mock()
        mock_response.status_code = 500
        mock_response.text = "Server Error"
        http_error = requests.HTTPError()
        mock_response.raise_for_status.side_effect = http_error
        mock_get.return_value = mock_response

        url = "https://example.com/"
        query_runner = BaseHTTPQueryRunner({})
        response, error = query_runner.get_response(url)
        mock_get.assert_called_once_with("get", url, auth=None)
        self.assertIsNotNone(error)
        self.assertIn("Failed to execute query", error)

    @mock.patch("requests.request")
    def test_get_response_requests_exception(self, mock_get):
        mock_response = mock.Mock()
        mock_response.status_code = 500
        mock_response.text = "Server Error"
        exception_message = "Some requests exception"
        requests_exception = requests.RequestException(exception_message)
        mock_response.raise_for_status.side_effect = requests_exception
        mock_get.return_value = mock_response

        url = "https://example.com/"
        query_runner = BaseHTTPQueryRunner({})
        response, error = query_runner.get_response(url)
        mock_get.assert_called_once_with("get", url, auth=None)
        self.assertIsNotNone(error)
        self.assertEqual(exception_message, error)

    @mock.patch("requests.request")
    def test_get_response_generic_exception(self, mock_get):
        mock_response = mock.Mock()
        mock_response.status_code = 500
        mock_response.text = "Server Error"
        exception_message = "Some generic exception"
        exception = ValueError(exception_message)
        mock_response.raise_for_status.side_effect = exception
        mock_get.return_value = mock_response

        url = "https://example.com/"
        query_runner = BaseHTTPQueryRunner({})
        self.assertRaisesRegex(
            ValueError, exception_message, query_runner.get_response, url
        )
