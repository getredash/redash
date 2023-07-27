from advocate.exceptions import UnacceptableAddressException  # noqa: F401

from redash import settings

if settings.ENFORCE_PRIVATE_ADDRESS_BLOCK:
    import advocate as requests_or_advocate
else:
    import requests as requests_or_advocate


class ConfiguredSession(requests_or_advocate.Session):
    def request(self, *args, **kwargs):
        if not settings.REQUESTS_ALLOW_REDIRECTS:
            kwargs.update({"allow_redirects": False})
        return super().request(*args, **kwargs)


requests_session = ConfiguredSession()
