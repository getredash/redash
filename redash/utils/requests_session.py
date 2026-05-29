import warnings

from redash import settings

with warnings.catch_warnings():
    # Supress advocate warning below
    #   /usr/local/lib/python3.13/site-packages/advocate/api.py:102: SyntaxWarning: invalid escape sequence '\*'
    #   server-1     |   :param \*\*kwargs: Optional arguments that ``request`` takes.
    warnings.filterwarnings("ignore", category=SyntaxWarning, module=r".*advocate.*")

    from advocate.exceptions import UnacceptableAddressException  # noqa: F401, E402

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
