.PHONY: compose_build up test_db create_database clean down tests lint backend-unit-tests frontend-unit-tests test build watch start redis-cli bash

compose_build: .env
	COMPOSE_DOCKER_CLI_BUILD=1 DOCKER_BUILDKIT=1 docker compose build

up:
	COMPOSE_DOCKER_CLI_BUILD=1 DOCKER_BUILDKIT=1 docker compose up -d --build

test_db:
	@for i in `seq 1 5`; do \
		if (docker compose exec postgres sh -c 'psql -U postgres -c "select 1;"' 2>&1 > /dev/null) then break; \
		else echo "postgres initializing..."; sleep 5; fi \
	done
	docker compose exec postgres sh -c 'psql -U postgres -c "drop database if exists tests;" && psql -U postgres -c "create database tests;"'

create_database: .env
	docker compose run server create_db

clean:
	docker compose down && docker compose rm

down:
	docker compose down

.env:
	printf "REDASH_COOKIE_SECRET=`pwgen -1s 32`\nREDASH_SECRET_KEY=`pwgen -1s 32`\n" >> .env

env: .env

format:
	pre-commit run --all-files

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
