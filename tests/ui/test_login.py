# -*- coding: utf-8 -*-

"""UI tests for the login page."""

import pytest


@pytest.fixture
def login_url(live_server, factory):
    """Return the URL for the login page of the org."""
    return '{live_server.url}/{org.slug}/login'.format(
        live_server=live_server,
        org=factory.org,
    )


def test_login_title(selenium, login_url):
    """Test the title of the login page."""
    selenium.get(login_url)

    assert selenium.title == 'Login to Redash'
