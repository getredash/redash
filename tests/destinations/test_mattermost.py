import json
from unittest import mock

from redash.destinations.mattermost import Mattermost
from redash.models import Alert


def test_mattermost_notify_encodes_unicode_as_utf8():
    alert = mock.Mock()
    alert.custom_subject = "Тревога: утро"
    alert.custom_body = None
    query = mock.Mock()
    user = mock.Mock()
    app = mock.Mock()
    host = "http://redash.local"
    options = {"url": "https://example.com/hooks/abc"}
    metadata = {}
    destination = Mattermost(options)

    with mock.patch("redash.destinations.mattermost.requests.post") as mock_post:
        mock_response = mock.Mock()
        mock_response.status_code = 200
        mock_response.text = "ok"
        mock_post.return_value = mock_response

        destination.notify(
            alert, query, user, Alert.TRIGGERED_STATE, app, host, metadata, options
        )

    sent_data = mock_post.call_args.kwargs["data"]
    assert isinstance(sent_data, bytes)
    decoded = json.loads(sent_data.decode("utf-8"))
    assert decoded["text"] == alert.custom_subject
    assert "Тревога: утро" in sent_data.decode("utf-8")
