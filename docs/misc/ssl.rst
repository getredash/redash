SSL (HTTPS) Setup
=================

If you used the provided images or the bootstrap script, to start using
SSL with your instance you need to:

1. Update the nginx config file (``/etc/nginx/sites-available/redash``)
   with SSL configuration (see below an example). Make sure to upload
   the certificate to the server, and set the paths correctly in the new
   config.

2. Open port 443 in your security group (if using AWS or GCE).

.. code:: nginx

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
