import requests

from redash import settings
from redash.utils import ssrf
from redash.utils.ssrf import UnacceptableAddressException  # noqa: F401

if settings.ENFORCE_PRIVATE_ADDRESS_BLOCK:
    requests_or_ssrf = ssrf
else:
    requests_or_ssrf = requests


class ConfiguredSession(requests_or_ssrf.Session):
    def request(self, *args, **kwargs):
        if not settings.REQUESTS_ALLOW_REDIRECTS:
            kwargs.update({"allow_redirects": False})
        return super().request(*args, **kwargs)


requests_session = ConfiguredSession()
