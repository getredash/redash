FROM redash/base:latest

ENV DEBIAN_FRONTEND=noninteractive \
    MOZ_HEADLESS=1

RUN dependencies=' \
        bzip2 \
        curl \
        firefox \
    ' \
    && set -x \
    && apt-get -qq update && apt-get -qq install --no-install-recommends -y $dependencies \
    && rm -rf /var/lib/apt/lists/* /var/cache/apt/*

ENV FIREFOX_VERSION=59.0
RUN FIREFOX_DOWNLOAD_URL=https://download-installer.cdn.mozilla.net/pub/firefox/releases/$FIREFOX_VERSION/linux-x86_64/en-US/firefox-$FIREFOX_VERSION.tar.bz2 \
    && apt-get -y purge firefox \
    && rm -rf /opt/firefox \
    && curl -sSL $FIREFOX_DOWNLOAD_URL -o /tmp/firefox.tar.bz2 \
    && tar -C /opt -xjf /tmp/firefox.tar.bz2 \
    && rm /tmp/firefox.tar.bz2 \
    && mv /opt/firefox /opt/firefox-$FIREFOX_VERSION \
    && ln -fs /opt/firefox-$FIREFOX_VERSION/firefox /usr/bin/firefox

ENV GECKODRIVER_VERSION=0.20.0
RUN GECKODRIVER_DOWNLOAD_URL=https://github.com/mozilla/geckodriver/releases/download/v$GECKODRIVER_VERSION/geckodriver-v$GECKODRIVER_VERSION-linux64.tar.gz \
    && rm -rf /opt/geckodriver \
    && curl -sSL $GECKODRIVER_DOWNLOAD_URL -o /tmp/geckodriver.tar.gz \
    && tar -C /opt -zxf /tmp/geckodriver.tar.gz \
    && rm /tmp/geckodriver.tar.gz \
    && mv /opt/geckodriver /opt/geckodriver-$GECKODRIVER_VERSION \
    && chmod 755 /opt/geckodriver-$GECKODRIVER_VERSION \
    && ln -fs /opt/geckodriver-$GECKODRIVER_VERSION /usr/bin/geckodriver

# We first copy only the requirements file, to avoid rebuilding on every file
# change.
COPY requirements.txt requirements_dev.txt requirements_all_ds.txt ./
RUN pip install -r requirements.txt -r requirements_dev.txt -r requirements_all_ds.txt

COPY . ./
RUN npm install && npm run build && rm -rf node_modules
RUN chown -R redash /app
USER redash

ENTRYPOINT ["/app/bin/docker-entrypoint"]
