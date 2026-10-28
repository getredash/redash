---
title: HTTPS (SSL) Setup
---

:::caution

The instructions below are for the legacy images. If you use the new Docker based images, see the following guide:

[https://gist.github.com/arikfr/64c9ff8d2f2b703d4e44fe9e45a7730e](https://gist.github.com/arikfr/64c9ff8d2f2b703d4e44fe9e45a7730e)

:::

If you used the provided images or the bootstrap script, to start using SSL with your instance you need to:

1. Update the nginx config file (`/etc/nginx/sites-available/redash`) with SSL configuration (see below an example). Make sure to upload the certificate to the server, and set the paths correctly in the new config.
2. Open port 443 in your security group (if using AWS or GCE).

```
upstream redash_servers {
  server 127.0.0.1:5000;
}

server {
  listen 80;

  # Allow accessing /ping without https. Useful when placing behind load balancer.
  location /ping {
    proxy_set_header Host $http_host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_pass       http://redash_servers;
  }

  location / {
    # Enforce SSL.
    return 301 https://$host$request_uri;
  }
}

server {
  listen 443 ssl;

  # Make sure to set paths to your certificate .pem and .key files.
  ssl on;
  ssl_certificate /path-to/cert.pem; # or crt
  ssl_certificate_key /path-to/cert.key;

  # As per the Mozilla SSL Configuration Generator (https://ssl-config.mozilla.org), using the Intermediate setting.
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384:DHE-RSA-CHACHA20-POLY1305;
  ssl_prefer_server_ciphers off;

  access_log /var/log/nginx/redash.access.log;

  gzip on;
  gzip_types *;
  gzip_proxied any;

  location / {
    proxy_set_header Host $http_host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_pass       http://redash_servers;
    proxy_redirect   off;
  }
}
```

## Using another proxy/load balancer in front of nginx

If you setup includes another proxy/load balancer in front of Redash's nginx, you will need to add the following header to your nginx configuration to make sure it knows the correct protocol in use:

```
proxy_set_header X-Forwarded-Proto $http_x_forwarded_proto;
```
