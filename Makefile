.PHONY: compose_build test_db create_database clean bundle tests build watch start

compose_build:
	docker-compose build

test_db:
	docker-compose run --rm postgres psql -h postgres -U postgres -c "create database tests"

create_database:
	docker-compose run server create_db

clean:
	docker ps -a -q | xargs docker kill;docker ps -a -q | xargs docker rm

bundle:
	docker-compose run server bin/bundle-extensions

tests:
	docker-compose run server tests

build: bundle
	npm run build

watch: bundle
	npm run watch

start: bundle
	npm run start
