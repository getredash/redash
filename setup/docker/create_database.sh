#!/bin/bash
# This script assumes you're using docker-compose, with at least two images: redash for the redash instance
# and postgres for the postgres instance.
#
# This script is not idempotent and should be run once.

run_redash="docker-compose run --rm redash"

$run_redash /opt/redash/current/manage.py database create_tables

# Create default admin user
$run_redash /opt/redash/current/manage.py users create --admin --password admin "Admin" "admin"

# This is a hack to get the Postgres IP and PORT from the instance itself.
temp_env_file=$(mktemp /tmp/pg_env.XXXXXX || exit 3)
docker-compose run --rm postgres env > "$temp_env_file"
source "$temp_env_file"

run_psql="docker-compose run --rm postgres psql -h $POSTGRES_PORT_5432_TCP_ADDR -p $POSTGRES_PORT_5432_TCP_PORT -U postgres"

# Create redash_reader user. We don't use a strong password, as the instance supposed to be accesible only from the redash host.
$run_psql -c "CREATE ROLE redash_reader WITH PASSWORD 'redash_reader' NOCREATEROLE NOCREATEDB NOSUPERUSER LOGIN"
$run_psql -c "grant select(id,name,type) ON data_sources to redash_reader;"
$run_psql -c "grant select(id,name) ON users to redash_reader;"
$run_psql -c "grant select on events, queries, dashboards, widgets, visualizations, query_results to redash_reader;"

$run_redash /opt/redash/current/manage.py ds new "re:dash metadata" --type "pg" --options "{\"user\": \"redash_reader\", \"password\": \"redash_reader\", \"host\": \"postgres\", \"dbname\": \"postgres\"}"
