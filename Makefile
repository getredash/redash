.PHONY: compose_build up test_db create_database create_db clean clean-all down tests lint backend-unit-tests frontend-unit-tests pydeps test build watch start redis-cli bash

export COMPOSE_DOCKER_CLI_BUILD=1
export DOCKER_BUILDKIT=1
export COMPOSE_PROFILES=local

compose_build: .env
	docker compose build

up:
	docker compose up -d redis postgres
	docker compose exec -u postgres postgres psql postgres --csv \
		-1tqc "SELECT table_name FROM information_schema.tables WHERE table_name = 'organizations'" 2> /dev/null \
		| grep -q "organizations" || make create_database
	docker compose up -d --build

test_db:
	@for i in `seq 1 5`; do \
		if (docker compose exec postgres sh -c 'psql -U postgres -c "select 1;"' 2>&1 > /dev/null) then break; \
		else echo "postgres initializing..."; sleep 5; fi \
	done
	docker compose exec postgres sh -c 'psql -U postgres -c "drop database if exists tests;" && psql -U postgres -c "create database tests;"'

create_db: .env
	docker compose run server create_db

create_database: create_db

clean:
	docker compose down
	docker compose --project-name cypress down
	docker compose rm --stop --force
	docker compose --project-name cypress rm --stop --force
	docker image rm --force \
		cypress-server:latest cypress-worker:latest cypress-scheduler:latest \
		redash-server:latest redash-worker:latest redash-scheduler:latest
	docker container prune --force
	docker image prune --force
	docker volume prune --force

clean-all: clean
	docker image rm --force \
		redash/redash:10.1.0.b50633 redis:7-alpine maildev/maildev:latest \
		pgautoupgrade/pgautoupgrade:15-alpine3.8 pgautoupgrade/pgautoupgrade:latest

down:
	docker compose down

.env:
	printf "REDASH_COOKIE_SECRET=`pwgen -1s 32`\nREDASH_SECRET_KEY=`pwgen -1s 32`\n" >> .env

env: .env

format:
	pre-commit run --all-files

pydeps:
	pip3 install wheel
	pip3 install --upgrade black ruff launchpadlib pip setuptools
	pip3 install poetry
	poetry install --only main,all_ds,dev

tests:
	docker compose run server tests

lint:
	ruff check .
	black --check . --diff

backend-unit-tests: up test_db
	docker compose run --rm --name tests server tests

frontend-unit-tests:
	CYPRESS_INSTALL_BINARY=0 PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1 yarn --frozen-lockfile
	yarn test

test: backend-unit-tests frontend-unit-tests lint

build:
	yarn build

watch:
	yarn watch

start:
	yarn start

redis-cli:
	docker compose run --rm redis redis-cli -h redis

bash:
	docker compose run --rm server bash
