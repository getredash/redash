FROM nginx
MAINTAINER Di Wu <diwu@yelp.com>

COPY nginx.conf /etc/nginx/nginx.conf

RUN mkdir -p /var/log/nginx/log && \
  touch /var/log/nginx/log/access.log && \
  touch /var/log/nginx/log/error.log
