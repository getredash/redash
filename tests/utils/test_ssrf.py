import ipaddress
import socket
from unittest import TestCase, mock

import requests

from redash.utils import ssrf


def resolves_to(address):
    return mock.patch.object(
        ssrf.socket,
        "getaddrinfo",
        return_value=[(socket.AF_INET, socket.SOCK_STREAM, 6, "", (address, 80))],
    )


class TestIsIpAllowed(TestCase):
    def assert_allowed(self, address, allowed):
        self.assertEqual(allowed, ssrf.is_ip_allowed(ipaddress.ip_address(address), set()), address)

    def test_public_ipv4(self):
        self.assert_allowed("93.184.215.14", True)

    def test_non_public_ipv4(self):
        for address in [
            "127.0.0.1",
            "10.1.2.3",
            "172.16.0.1",
            "192.168.1.1",
            "169.254.169.254",
            "100.64.0.1",
            "0.0.0.0",
            "255.255.255.255",
            "224.0.0.1",
            "192.88.99.1",
        ]:
            self.assert_allowed(address, False)

    def test_ipv6(self):
        for address in ["2606:2800:220:1::1", "::1", "::ffff:127.0.0.1", "fd00::1"]:
            self.assert_allowed(address, False)

    def test_local_address(self):
        address = ipaddress.ip_address("93.184.215.14")
        self.assertFalse(ssrf.is_ip_allowed(address, {address}))


class TestSession(TestCase):
    def test_rejects_hostname_resolving_to_private_address(self):
        with resolves_to("10.0.0.1"):
            with self.assertRaises(ssrf.UnacceptableAddressException):
                ssrf.get("http://internal.example.com/")

    def test_rejects_https_to_private_address(self):
        with resolves_to("169.254.169.254"):
            with self.assertRaises(ssrf.UnacceptableAddressException):
                ssrf.get("https://metadata.example.com/")

    def test_rejects_disallowed_port(self):
        with self.assertRaises(ssrf.UnacceptableAddressException):
            ssrf.get("http://example.com:6379/")

    def test_connects_to_allowed_address(self):
        with resolves_to("93.184.215.14"), mock.patch.object(ssrf.socket, "socket") as socket_class:
            socket_class.return_value.connect.side_effect = ConnectionRefusedError()
            # The connection attempt reaches the socket, and fails like any other refused connection.
            with self.assertRaises(requests.ConnectionError):
                ssrf.get("http://example.com/")
        socket_class.return_value.connect.assert_called_with(("93.184.215.14", 80))

    def test_proxies_are_refused(self):
        with self.assertRaises(ssrf.ProxyDisabledException):
            ssrf.get("http://example.com/", proxies={"http": "http://proxy.example.com:8080"})

    def test_cannot_mount_other_adapters(self):
        with self.assertRaises(ValueError):
            ssrf.Session().mount("http://", requests.adapters.HTTPAdapter())
