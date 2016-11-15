HTTPS proxy pass for Nginx in HTTP without change to SSL Re:dash setup
===========

Webserver HTTPS  >> Re:dash HTTP

When you have a web server with SSL (Apache, HaProxy, other nginx, etc) you can setup HTTPS proxy pass from web server to Re:dash nginx. Follow the steps below:

You must have change (``proxy_set_header X-Forwarded-Proto``), from (``$scheme``) to (``https``), this change force nginx set https for all requests.
