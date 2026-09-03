import json
from unittest import mock

from redash.destinations.mattermost import Mattermost


def test_mattermost_notify_sends_utf8_payload():
    alert = mock.Mock()
    alert.custom_subject = (
        "Test Subject With Unicode: "
        "\u041f\u0440\u0438\u0432\u0435\u0442"
    )
    alert.custom_body = None
    alert.name = "Test Alert"

    query = mock.Mock()
    user = mock.Mock()
    app = mock.Mock()
    host = "http://redash.local"
    metadata = {}
    options = {"url": "https://example.com/mattermost"}
    destination = Mattermost(options)

    with mock.patch("redash.destinations.mattermost.requests.post") as mock_post:
        mock_response = mock.Mock()
        mock_response.status_code = 200
        mock_post.return_value = mock_response

        destination.notify(
            alert, query, user, "triggered", app, host, metadata, options
        )

        sent_data = mock_post.call_args.kwargs["data"]

    assert isinstance(sent_data, bytes)

    decoded_data = json.loads(sent_data.decode("utf-8"))
    assert decoded_data["text"] == alert.custom_subject
    assert alert.custom_subject in sent_data.decode("utf-8")
