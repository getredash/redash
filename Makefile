NAME=redash
VERSION=`python ./manage.py version`
FULL_VERSION=$(VERSION)+b$(CIRCLE_BUILD_NUM)
# VERSION gets evaluated every time it's referenced, therefore we need to use VERSION here instead of FULL_VERSION.
FILENAME=$(CIRCLE_ARTIFACTS)/$(NAME).$(VERSION).tar.gz

deps:
	cd rd_ui && npm install
	cd rd_ui && npm install -g bower grunt-cli
	cd rd_ui && bower install
	cd rd_ui && grunt build

pack:
	sed -ri "s/^__version__ = '([0-9.]*)'/__version__ = '$(FULL_VERSION)'/" redash/__init__.py
	tar -zcv -f $(FILENAME) --exclude=".git*" --exclude="*.pyc" --exclude="*.pyo" --exclude="venv" --exclude="rd_ui/node_modules" --exclude="rd_ui/dist/bower_components" --exclude="rd_ui/app" *

upload:
	python bin/upload_version.py $(VERSION) $(FILENAME)

test:
	nosetests --with-coverage --cover-package=redash tests/*.py
	cd rd_ui && grunt test
