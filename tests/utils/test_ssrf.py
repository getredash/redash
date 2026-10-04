import datetime
import ipaddress
import os
import socket
import ssl
import tempfile
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer
from unittest import TestCase, mock

import requests
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.x509.oid import NameOID

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


PROXY_VARIABLES = ["http_proxy", "https_proxy", "all_proxy", "no_proxy"]


class SessionTestCase(TestCase):
    def setUp(self):
        # requests picks up proxies from the environment, and the session refuses proxies.
        environ = mock.patch.dict(os.environ)
        environ.start()
        self.addCleanup(environ.stop)
        for name in PROXY_VARIABLES:
            os.environ.pop(name, None)
            os.environ.pop(name.upper(), None)


class TestSession(SessionTestCase):
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

    def test_proxy_refusal_is_a_request_exception(self):
        # HTTP query runners turn RequestExceptions into query errors.
        with self.assertRaises(requests.RequestException):
            ssrf.get("http://example.com/", proxies={"http": "http://proxy.example.com:8080"})

    def test_cannot_mount_other_adapters(self):
        with self.assertRaises(ValueError):
            ssrf.Session().mount("http://", requests.adapters.HTTPAdapter())


def resolve_hosts(hosts):
    def getaddrinfo(host, port, *args, **kwargs):
        return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", (hosts[host], port))]

    return mock.patch.object(ssrf.socket, "getaddrinfo", side_effect=getaddrinfo)


def self_signed_cert(hostname, directory):
    key = ec.generate_private_key(ec.SECP256R1())
    name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, hostname)])
    now = datetime.datetime.now(datetime.timezone.utc)
    cert = (
        x509.CertificateBuilder()
        .subject_name(name)
        .issuer_name(name)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - datetime.timedelta(days=1))
        .not_valid_after(now + datetime.timedelta(days=1))
        .add_extension(x509.SubjectAlternativeName([x509.DNSName(hostname)]), critical=False)
        .add_extension(x509.BasicConstraints(ca=True, path_length=None), critical=True)
        .sign(key, hashes.SHA256())
    )
    cert_path, key_path = f"{directory}/cert.pem", f"{directory}/key.pem"
    with open(cert_path, "wb") as f:
        f.write(cert.public_bytes(serialization.Encoding.PEM))
    with open(key_path, "wb") as f:
        f.write(
            key.private_bytes(
                serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()
            )
        )
    return cert_path, key_path


class LocalServerTestCase(SessionTestCase):
    """Runs a local server and lets the SSRF checks accept 127.0.0.1 and its port."""

    redirect_to = None

    def start_server(self, tls_files=None):
        redirect_to = self.redirect_to
        self.requests = requests_served = []

        class Handler(BaseHTTPRequestHandler):
            def do_GET(self):
                requests_served.append(self.path)
                if redirect_to:
                    self.send_response(302)
                    self.send_header("Location", redirect_to.format(port=self.server.server_port))
                    self.end_headers()
                    return
                self.send_response(200)
                self.end_headers()
                self.wfile.write(b"ok")

            def log_message(self, *args):
                pass

        server = HTTPServer(("127.0.0.1", 0), Handler)
        if tls_files:
            context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
            context.minimum_version = ssl.TLSVersion.TLSv1_2
            context.load_cert_chain(*tls_files)
            server.socket = context.wrap_socket(server.socket, server_side=True)
        threading.Thread(target=server.serve_forever, daemon=True).start()
        self.addCleanup(server.server_close)
        self.addCleanup(server.shutdown)

        port = server.server_port
        is_ip_allowed = ssrf.is_ip_allowed
        for patcher in [
            mock.patch.object(ssrf, "ALLOWED_PORTS", ssrf.ALLOWED_PORTS | {port}),
            mock.patch.object(
                ssrf,
                "is_ip_allowed",
                side_effect=lambda ip, local_ips: str(ip) == "127.0.0.1" or is_ip_allowed(ip, local_ips),
            ),
        ]:
            patcher.start()
            self.addCleanup(patcher.stop)
        return port


class TestRedirects(LocalServerTestCase):
    redirect_to = "http://internal.example:{port}/"

    def test_redirect_to_private_address_is_rejected(self):
        port = self.start_server()
        with resolve_hosts({"public.example": "127.0.0.1", "internal.example": "10.0.0.1"}):
            with self.assertRaises(ssrf.UnacceptableAddressException):
                ssrf.get(f"http://public.example:{port}/")
        # The first request was served; it's the redirect target that was refused.
        self.assertEqual(["/"], self.requests)


class TestHTTPS(LocalServerTestCase):
    def setUp(self):
        super().setUp()
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.cert_path, key_path = self_signed_cert("public.example", directory.name)
        self.port = self.start_server(tls_files=(self.cert_path, key_path))

    def test_verified_request_succeeds(self):
        with resolve_hosts({"public.example": "127.0.0.1"}):
            response = ssrf.get(f"https://public.example:{self.port}/", verify=self.cert_path)
        self.assertEqual(b"ok", response.content)

    def test_certificate_is_checked_against_the_hostname(self):
        with resolve_hosts({"other.example": "127.0.0.1"}):
            with self.assertRaises(requests.exceptions.SSLError):
                ssrf.get(f"https://other.example:{self.port}/", verify=self.cert_path)
