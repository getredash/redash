#!/usr/bin/env bash

workpath="/opt/redash/current"
manage="${workpath}/manage.py"
database_init="${workpath}/setup/docker/redash_database_init.py"

[ -z "${REDASH_DEFAULT_ADMIN_NAME}" ] && REDASH_DEFAULT_ADMIN_NAME="Admin"
[ -z "${REDASH_DEFAULT_ADMIN_LOGIN}" ] && REDASH_DEFAULT_ADMIN_LOGIN="admin"
[ -z "${REDASH_DEFAULT_ADMIN_PASSWORD}" ] && REDASH_DEFAULT_ADMIN_PASSWORD="admin"

# [ -z "${REDASH_DATABASE_HOST}" ]
[ -z "${REDASH_DATABASE_NAME}" ] && REDASH_DATABASE_NAME="postgres"

final() {
    exit $1
}

fail() {
    echo "$1" >&2
    final 1
}

end() {
    final 0
}

"${database_init}" "create_db_and_role" || fail "Something went wrong during database and role creation"

if "${database_init}" "check_database_init"
then
    echo "database seems to be already populated... doing nothing"
else
    echo "database seems to be empty. Creating tables"
    "${manage}" database create_tables
    "${manage}" users create --admin --password "${REDASH_DEFAULT_ADMIN_PASSWORD}" "${REDASH_DEFAULT_ADMIN_NAME}" "${REDASH_DEFAULT_ADMIN_LOGIN}"
fi

"${database_init}" "create_reader_role"

if "${database_init}" "check_redash_metadata"
then
    echo "re:dash metadata seems to already exists... doing nothing"
else
    echo "re:dash metadata seems to not be present. Inserting enreg"
    "${manage}" ds new -n "re:dash metadata" -t "pg" -o "{\"user\": \"redash_reader\", \"password\": \"redash_reader\", \"host\": \"${REDASH_DATABASE_HOST}\", \"dbname\": \"${REDASH_DATABASE_NAME}\"}"
fi

