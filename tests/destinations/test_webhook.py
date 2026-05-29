import json
from unittest import mock

from redash.destinations.webhook import Webhook
from redash.models import Alert


def test_webhook_notify_handles_unicode():
    # Create a mock alert with all the properties needed by serialize_alert
    alert = mock.Mock()
    alert.id = 1
    alert.name = "Test Alert"
    alert.custom_subject = "Test Subject With Unicode: 晨"
    alert.custom_body = "Test Body"
    alert.options = {}
    alert.state = "ok"
    alert.last_triggered_at = None
    alert.updated_at = "2025-12-02T08:00:00Z"
    alert.created_at = "2025-12-02T08:00:00Z"
    alert.rearm = None
    alert.query_id = 10
    alert.user_id = 20

    query = mock.Mock()
    user = mock.Mock()
    app = mock.Mock()
    host = "http://redash.local"
    options = {"url": "https://example.com/webhook", "username": "user", "password": "password"}
    metadata = {}
    new_state = Alert.TRIGGERED_STATE
    destination = Webhook(options)

    with mock.patch("redash.destinations.webhook.requests.post") as mock_post:
        mock_response = mock.Mock()
        mock_response.status_code = 200
        mock_post.return_value = mock_response

        destination.notify(alert, query, user, new_state, app, host, metadata, options)

        # Get the data passed to the mock
        call_args, call_kwargs = mock_post.call_args
        sent_data = call_kwargs["data"]

        # 1. Make sure we send bytes
        assert isinstance(sent_data, bytes)

        # 2. Make sure the bytes are the correct UTF-8 encoded JSON
        decoded_data = json.loads(sent_data.decode("utf-8"))
        assert decoded_data["alert"]["title"] == alert.custom_subject
        assert "Test Subject With Unicode: 晨" in sent_data.decode("utf-8")
