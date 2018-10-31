.PHONY: compose_build up test_db create_database clean down bundle tests backend-unit-tests test build watch start

compose_build:
	docker-compose build

up:
	docker-compose up -d --build

test_db:
	docker-compose run --rm postgres psql -h postgres -U postgres -c "create database tests"

create_database:
	docker-compose run server create_db

clean:
	docker ps -a -q | xargs docker kill;docker ps -a -q | xargs docker rm

down:
	docker-compose down

bundle:
	docker-compose run server bin/bundle-extensions

tests:
	docker-compose run server tests

backend-unit-tests: up test_db
	sleep 10
	docker-compose run --name tests server tests

test: backend-unit-tests

build: bundle
	npm run build

watch: bundle
	npm run watch

start: bundle
	npm run start
