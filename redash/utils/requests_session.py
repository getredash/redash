import warnings

from redash import settings

if settings.ENFORCE_PRIVATE_ADDRESS_BLOCK:
    with warnings.catch_warnings():
        warnings.filterwarnings("ignore", category=SyntaxWarning, module=r".*advocate.*")
        try:
            import advocate as requests_or_advocate
            from advocate.exceptions import (
                UnacceptableAddressException,  # noqa: F401, E402
            )
        except ImportError as e:
            raise RuntimeError(
                "ENFORCE_PRIVATE_ADDRESS_BLOCK requires the advocate package. "
                "Install it in your environment (e.g. pip install advocate). "
                "Note: advocate currently constrains urllib3 to <2."
            ) from e
else:
    import requests as requests_or_advocate

    class UnacceptableAddressException(Exception):
        """Only raised when advocate is used (ENFORCE_PRIVATE_ADDRESS_BLOCK)."""

        pass


class ConfiguredSession(requests_or_advocate.Session):
    def request(self, *args, **kwargs):
        if not settings.REQUESTS_ALLOW_REDIRECTS:
            kwargs.update({"allow_redirects": False})
        return super().request(*args, **kwargs)


requests_session = ConfiguredSession()
