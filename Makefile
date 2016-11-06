NAME=redash
VERSION=`python ./manage.py version`
FULL_VERSION=$(VERSION)+b$(CIRCLE_BUILD_NUM)
BASE_VERSION=$(shell python ./manage.py version | cut -d + -f 1)
# VERSION gets evaluated every time it's referenced, therefore we need to use VERSION here instead of FULL_VERSION.
FILENAME=$(CIRCLE_ARTIFACTS)/$(NAME).$(VERSION).tar.gz

deps:
	if [ -d "./rd_ui/app" ]; then npm install; fi
	if [ -d "./rd_ui/app" ]; then npm run bower install; fi
	if [ -d "./rd_ui/app" ]; then npm run build; fi

pack:
	sed -ri "s/^__version__ = '([0-9.]*)'/__version__ = '$(FULL_VERSION)'/" redash/__init__.py
	tar -zcv -f $(FILENAME) --exclude="optipng*" --exclude=".git*" --exclude="*.pyc" --exclude="*.pyo" --exclude="venv" --exclude="node_modules" --exclude="rd_ui/dist/bower_components" --exclude="rd_ui/app" *

upload:
	python bin/release_manager.py $(CIRCLE_SHA1) $(BASE_VERSION) $(FILENAME)

test:
	nosetests --with-coverage --cover-package=redash tests/
