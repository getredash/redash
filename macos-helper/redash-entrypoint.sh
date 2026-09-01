#!/bin/sh -e

USER=redash

su - $USER -s /bin/bash -c "
cd /home/$USER/redash

set -x

if [[ \"$1\" == "clean" ]]
then
  export NVM_DIR=/home/$USER/.nvm
  source \$NVM_DIR/nvm.sh

  find . -name '__pycache__' -type d -exec rm -rf {} + >/dev/null 2>&1
  find . -name '*.pyc' -type f -delete >/dev/null 2>&1
  find . -name '.venv' -type d -exec rm -rf {} + >/dev/null 2>&1
  find . -name '.pnpm-store' -type d -exec rm -rf {} + >/dev/null 2>&1
  find . -name 'node_modules' -type d -exec rm -rf {} + >/dev/null 2>&1

  pnpm install
fi

if [ ! -d .venv ]; then
  python3 -m venv .venv

  source .venv/bin/activate

  pip3 install wheel
  pip3 install setuptools==80.10.2
  pip3 install --upgrade black ruff launchpadlib pip
  pip3 install uv==0.11.6

  uv sync --no-default-groups --group all_ds --group dev --link-mode=copy
fi

# make build
# make compose_build
# make create_database
# make up

set +x
"

if [[ "$1" == "rdp" || "$2" == "rdp" ]]
then
	rm -f /var/run/xrdp/xrdp*.pid >/dev/null 2>&1
	service dbus restart >/dev/null 2>&1
	/usr/lib/systemd/systemd-logind >/dev/null 2>&1 &
	[ -f /usr/sbin/sshd ] && /usr/sbin/sshd
	xrdp-sesman --config /etc/xrdp/sesman.ini
	xrdp --nodaemon --config /etc/xrdp/xrdp.ini
fi
