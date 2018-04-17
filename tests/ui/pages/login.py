# -*- coding: utf-8 -*-

"""Page object model for login."""

from pypom import Page

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as expected


class LoginPage(Page):
    """Page object model for the login."""

    URL_TEMPLATE = '/{org}/login/'

    @property
    def title(self):
        """Return the page title."""
        return self.wait.until(lambda s: self.selenium.title)

    @property
    def alert(self):
        """Return the alert element."""
        element = self.wait.until(expected.visibility_of_element_located((
            By.CSS_SELECTOR,
            ".alert-danger",
        )))
        return element.text

    @property
    def profile_dropdown(self):
        """Return the profile dropdown element."""
        element = self.wait.until(expected.visibility_of_element_located((
            By.CSS_SELECTOR,
            ".dropdown--profile__username",
        )))
        return element.text

    def enter_email(self, email):
        """Enter the given user email."""
        input_email = self.find_element(By.ID, 'inputEmail')
        input_email.send_keys(email)

    def enter_password(self, password):
        """Enter the given user password."""
        input_password = self.find_element(By.ID, 'inputPassword')
        input_password.send_keys(password)

    def click_login(self):
        """Click the login button."""
        btn = self.find_element(By.CSS_SELECTOR, "button[type='submit']")
        btn.click()

    def login(self, email='', password=''):
        """Log in the user with the given credentials."""
        self.enter_email(email)
        self.enter_password(password)
        self.click_login()
