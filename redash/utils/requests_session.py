from redash import settings

if settings.ENFORCE_PRIVATE_ADDRESS_BLOCK:
    try:
        import champion as requests_or_champion
        from champion.exceptions import (
            UnacceptableAddressException,  # noqa: F401, E402
        )
    except ImportError as e:
        raise RuntimeError(
            "ENFORCE_PRIVATE_ADDRESS_BLOCK requires the champion package. "
            "Install it in your environment (e.g. pip install "
            "git+https://github.com/Gee19/champion.git)."
        ) from e
else:
    import requests as requests_or_champion

    class UnacceptableAddressException(Exception):
        """Only raised when champion is used (ENFORCE_PRIVATE_ADDRESS_BLOCK)."""

        pass


class ConfiguredSession(requests_or_champion.Session):
    def request(self, *args, **kwargs):
        if not settings.REQUESTS_ALLOW_REDIRECTS:
            kwargs.update({"allow_redirects": False})
        return super().request(*args, **kwargs)


requests_session = ConfiguredSession()
