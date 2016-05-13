#!/bin/bash
set -e

help() {
  echo "Usage: "
  echo "`basename "$0"` {start, test}"
}

case "$1" in
  start)
    vagrant up
    vagrant ssh -c "cd /opt/redash/current; bin/run honcho start -f Procfile.dev;"
    ;;
  test)
    vagrant up
    vagrant ssh -c "cd /opt/redash/current; make test"
    ;;
  *)
    help
    ;;
esac