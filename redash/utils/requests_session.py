import requests
from redash import settings


class ConfiguredSession(requests.Session):
    def request(self, *args, **kwargs):
        if not settings.REQUESTS_ALLOW_REDIRECTS:
            kwargs.update({"allow_redirects": False})
        return super(ConfiguredSession, self).request(*args, **kwargs)


requests_session = ConfiguredSession()
