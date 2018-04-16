FROM redash/base:latest

ENV DEBIAN_FRONTEND=noninteractive \
    MOZ_HEADLESS=1 \
    FIREFOX_VERSION=59.0 \
    GECKODRIVER_VERSION=0.20.0

# Install requirements for UI tests
RUN dependencies=' \
        bzip2 \
        curl \
        firefox \
    ' \
    && set -x \
    && apt-get -qq update && apt-get -qq install --no-install-recommends -y $dependencies \
    && apt-get -y purge firefox \
    && rm -rf /var/lib/apt/lists/* /var/cache/apt/*

COPY bin/install-firefox.sh /usr/local/bin/install-firefox
COPY bin/install-geckodriver.sh /usr/local/bin/install-geckodriver

RUN install-firefox
RUN install-geckodriver

# We first copy only the requirements file, to avoid rebuilding on every file
# change.
COPY requirements.txt requirements_dev.txt requirements_all_ds.txt ./
RUN pip install -r requirements.txt -r requirements_dev.txt -r requirements_all_ds.txt

COPY . ./
RUN npm install && npm run build && rm -rf node_modules
RUN chown -R redash /app
USER redash

ENTRYPOINT ["/app/bin/docker-entrypoint"]
