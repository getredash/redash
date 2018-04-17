# -*- coding: utf-8 -*-

"""UI tests for the login page."""


def test_login_wrong_user_credentials(login_page):
    """Test for a failed login attempt."""
    assert login_page.title == 'Login to Redash'

    login_page.login(email='wrong@example.com', password='wrong')

    assert login_page.alert == 'Wrong email or password.'
    assert login_page.title == 'Login to Redash'


def test_login(login_page, user, user_password):
    """Test for a successful login attempt."""
    assert login_page.title == 'Login to Redash'

    login_page.login(email=user.email, password=user_password)

    assert login_page.profile_dropdown == user.name
    assert login_page.title == 'Redash'
