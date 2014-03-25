NAME=redash
VERSION=`python ./manage.py version`
FULL_VERSION=$(VERSION)+b$(CIRCLE_BUILD_NUM)
FILENAME=$(CIRCLE_ARTIFACTS)/$(NAME).$(FULL_VERSION).tar.gz

deps:
	cd rd_ui && npm install
	cd rd_ui && npm install grunt-cli bower
	cd rd_ui && bower install
	cd rd_ui && grunt build

pack:
	tar -zcv -f $(FILENAME) --exclude=".git*" --exclude="*.pyc" --exclude="*.pyo" --exclude="venv" --exclude="rd_ui/node_modules" --exclude="rd_ui/dist/bower_components" --exclude="rd_ui/app" *

upload:
	python bin/upload_version.py $(FULL_VERSION) $(FILENAME)

migrate:
	source .env && PYTHONPATH=. python $(MIGRATION)

test:
	nosetests --with-coverage --cover-package=redash tests/*.py
