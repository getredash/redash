import requests

from redash import settings


# Temporary: advocate removed to enable urllib3 2.x upgrade.
# SSRF protection will be re-added via champion in a follow-up PR.
class UnacceptableAddressException(Exception):
    """Placeholder exception for when SSRF protection is not available."""

    pass


# Always use requests for now (advocate blocks urllib3 2.x).
# ENFORCE_PRIVATE_ADDRESS_BLOCK setting is temporarily non-functional.
requests_or_advocate = requests


class ConfiguredSession(requests_or_advocate.Session):
    def request(self, *args, **kwargs):
        if not settings.REQUESTS_ALLOW_REDIRECTS:
            kwargs.update({"allow_redirects": False})
        return super().request(*args, **kwargs)


requests_session = ConfiguredSession()
