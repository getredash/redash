#!/usr/bin/env sh

set -e

if [ -z "$GECKODRIVER_VERSION" ]; then
    echo "Set GECKODRIVER_VERSION environment variable." >&2
    exit 1
fi

# Remove existing Geckodriver files
sudo rm -rf /opt/geckodriver

GECKODRIVER_DOWNLOAD_URL=https://github.com/mozilla/geckodriver/releases/download/v$GECKODRIVER_VERSION/geckodriver-v$GECKODRIVER_VERSION-linux64.tar.gz
curl -sSL $GECKODRIVER_DOWNLOAD_URL -o /tmp/geckodriver.tar.gz

# Extract tarball
sudo tar -C /opt -zxf /tmp/geckodriver.tar.gz

# Remove gz archive
rm /tmp/geckodriver.tar.gz

# Create symlink to Geckodriver bin
sudo mv /opt/geckodriver /opt/geckodriver-$GECKODRIVER_VERSION
sudo chmod 755 /opt/geckodriver-$GECKODRIVER_VERSION
sudo ln -fs /opt/geckodriver-$GECKODRIVER_VERSION /usr/bin/geckodriver
