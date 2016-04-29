#!/usr/bin/env bash
set -e

function usage {
  echo "usage: ./test.sh <command>"
  echo
  echo "  unitTests                     run unit tests"
  echo
  exit -1
}
function setUp {
    virtualenv venv
    source venv/bin/activate
    pip install -r requirements.txt
}
function unitTests {
    setUp
    nosetests --with-coverage --cover-package=redash tests/
}

CMD=$1
if [ "`type -t $CMD`" != "function" ]; then
    usage
    exit 1
fi
echo "Running $CMD"
$CMD
