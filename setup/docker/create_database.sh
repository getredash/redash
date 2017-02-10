#!/bin/bash
# This script assumes you're using docker-compose, with at least two images: server for the redash instance
# and postgres for the postgres instance.
#
# This script is not idempotent and should be run once.

docker-compose start postgres

run_psql="docker-compose run --rm postgres psql -h postgres -U postgres"

# Create redash_reader user. We don't use a strong password, as the instance supposed to be accesible only from the redash host.
$run_psql -c "CREATE ROLE redash_reader WITH PASSWORD 'redash_reader' NOCREATEROLE NOCREATEDB NOSUPERUSER LOGIN"
$run_psql -c "grant select(id,name,type) ON data_sources to redash_reader;"
$run_psql -c "grant select(id,name) ON users to redash_reader;"
$run_psql -c "grant select on events, queries, dashboards, widgets, visualizations, query_results to redash_reader;"

run_redash="docker-compose run --rm server"

$run_redash create_db
