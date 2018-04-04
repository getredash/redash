# -*- coding: utf-8 -*-

"""UI tests for the login page."""

import pytest

from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


@pytest.fixture
def login_url(live_server, factory):
    """Return the URL for the login page of the org."""
    return '{live_server.url}/{org.slug}/login'.format(
        live_server=live_server,
        org=factory.org,
    )


def test_login_wrong_user_credentials(selenium, login_url):
    """Test for a failed login attempt."""
    selenium.get(login_url)

    assert selenium.title == 'Login to Redash'

    email = selenium.find_element_by_id('inputEmail')
    email.send_keys('wrong@example.com')

    password = selenium.find_element_by_id('inputPassword')
    password.send_keys('wrong')

    btn = selenium.find_element_by_css_selector("button[type='submit']")
    btn.click()

    alert = WebDriverWait(selenium, 10).until(
        EC.visibility_of_element_located((
            By.CSS_SELECTOR,
            ".alert-danger",
        ))
    )
    assert alert.text == 'Wrong email or password.'

    assert selenium.title == 'Login to Redash'


def test_login(selenium, login_url, user, user_password):
    """Test for a successful login attempt."""
    selenium.get(login_url)

    assert selenium.title == 'Login to Redash'

    email = selenium.find_element_by_id('inputEmail')
    email.send_keys(user.email)

    password = selenium.find_element_by_id('inputPassword')
    password.send_keys(user_password)

    btn = selenium.find_element_by_css_selector("button[type='submit']")
    btn.click()

    dropdown = WebDriverWait(selenium, 10).until(
        EC.visibility_of_element_located((
            By.CSS_SELECTOR,
            ".dropdown--profile__username",
        ))
    )
    assert dropdown.text == user.name

    assert selenium.title == 'Redash'
