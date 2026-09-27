"""A requests Session that refuses to connect to private addresses.

Adapted from Advocate (https://github.com/JordanMilne/Advocate, Apache License 2.0, see LICENSE.advocate),
which is no longer maintained and doesn't support urllib3 2. Only the parts Redash
uses are kept, with Advocate's default rules:

- Only globally routable IPv4 addresses are allowed: private, loopback, link-local,
  carrier-grade NAT, multicast, reserved and this machine's own addresses are
  rejected. IPv6 is rejected entirely.
- Only ports 80, 443, 8000, 8080 and 8443 are allowed.
- Proxies can't be used, since the proxy would make the connection on our behalf.

The check happens when the socket is opened, against the addresses the hostname
actually resolves to, so it can't be bypassed with DNS tricks or redirects.
"""

import ipaddress
import socket
from socket import timeout as SocketTimeout

import ifaddr
import requests
from requests import HTTPError, RequestException  # noqa: F401
from requests.adapters import DEFAULT_POOLBLOCK, HTTPAdapter
from urllib3 import HTTPConnectionPool, HTTPSConnectionPool, PoolManager
from urllib3.connection import HTTPConnection, HTTPSConnection
from urllib3.exceptions import ConnectTimeoutError

ALLOWED_PORTS = {80, 443, 8000, 8080, 8443}
# 6to4 relay anycast; there's no reason to connect to it directly.
SIXTOFOUR_RELAY_NETWORK = ipaddress.ip_network("192.88.99.0/24")


class UnacceptableAddressException(Exception):
    pass


class ProxyDisabledException(NotImplementedError):
    pass


def local_addresses():
    addresses = set()
    for adapter in ifaddr.get_adapters():
        for ip in adapter.ips:
            # IPv6 addresses come back as (address, flowinfo, scope_id)
            address = ip.ip[0] if isinstance(ip.ip, tuple) else ip.ip
            addresses.add(ipaddress.ip_address(address.split("%")[0]))
    return addresses


def is_ip_allowed(ip, local_ips):
    if ip.version != 4:
        return False
    if ip in local_ips or ip in SIXTOFOUR_RELAY_NETWORK:
        return False
    # is_global also rules out private, loopback, link-local, carrier-grade NAT and
    # reserved ranges; multicast addresses can still be "global".
    return ip.is_global and not ip.is_multicast


def create_connection(address, timeout=socket._GLOBAL_DEFAULT_TIMEOUT, source_address=None, socket_options=None):
    host, port = address
    if port not in ALLOWED_PORTS:
        raise UnacceptableAddressException(address)

    local_ips = local_addresses()
    error = None
    for family, socktype, proto, _, sockaddr in socket.getaddrinfo(host, port, 0, socket.SOCK_STREAM):
        if not is_ip_allowed(ipaddress.ip_address(sockaddr[0]), local_ips):
            continue

        sock = None
        try:
            sock = socket.socket(family, socktype, proto)
            for option in socket_options or []:
                sock.setsockopt(*option)
            if timeout is not socket._GLOBAL_DEFAULT_TIMEOUT:
                sock.settimeout(timeout)
            if source_address:
                sock.bind(source_address)
            sock.connect(sockaddr)
            return sock
        except OSError as e:
            error = e
            if sock is not None:
                sock.close()

    if error is not None:
        raise error
    raise UnacceptableAddressException(address)


class ValidatingConnectionMixin:
    def _new_conn(self):
        try:
            return create_connection(
                (self.host, self.port),
                self.timeout,
                source_address=self.source_address,
                socket_options=self.socket_options,
            )
        except SocketTimeout:
            raise ConnectTimeoutError(
                self, "Connection to {} timed out. (connect timeout={})".format(self.host, self.timeout)
            )


class ValidatingHTTPConnection(ValidatingConnectionMixin, HTTPConnection):
    pass


class ValidatingHTTPSConnection(ValidatingConnectionMixin, HTTPSConnection):
    pass


class ValidatingHTTPConnectionPool(HTTPConnectionPool):
    ConnectionCls = ValidatingHTTPConnection


class ValidatingHTTPSConnectionPool(HTTPSConnectionPool):
    ConnectionCls = ValidatingHTTPSConnection


class ValidatingPoolManager(PoolManager):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.pool_classes_by_scheme = {"http": ValidatingHTTPConnectionPool, "https": ValidatingHTTPSConnectionPool}


class ValidatingHTTPAdapter(HTTPAdapter):
    def init_poolmanager(self, connections, maxsize, block=DEFAULT_POOLBLOCK, **pool_kwargs):
        self._pool_connections = connections
        self._pool_maxsize = maxsize
        self._pool_block = block
        self.poolmanager = ValidatingPoolManager(num_pools=connections, maxsize=maxsize, block=block, **pool_kwargs)

    def proxy_manager_for(self, proxy, **proxy_kwargs):
        raise ProxyDisabledException("Proxies can't be used when private addresses are blocked.")


class Session(requests.Session):
    def __init__(self):
        self._allow_any_adapter = True
        super().__init__()
        self._allow_any_adapter = False
        self.mount("http://", ValidatingHTTPAdapter())
        self.mount("https://", ValidatingHTTPAdapter())

    def mount(self, prefix, adapter):
        # Mounting another adapter would bypass the address checks.
        if not self._allow_any_adapter and not isinstance(adapter, ValidatingHTTPAdapter):
            raise ValueError("Only address-validating adapters can be mounted.")
        super().mount(prefix, adapter)


def request(method, url, **kwargs):
    with Session() as session:
        return session.request(method=method, url=url, **kwargs)


def get(url, **kwargs):
    return request("get", url, **kwargs)
