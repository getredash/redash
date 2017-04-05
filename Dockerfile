FROM redash/base:latest

# We first copy only the requirements file, to avoid rebuilding on every file
# change.
COPY requirements.txt requirements_dev.txt requirements_all_ds.txt ./
RUN pip install -r requirements.txt -r requirements_dev.txt -r requirements_all_ds.txt
RUN apt-get update
RUN apt-get install -y apt-transport-https
RUN apt-get -y build-dep python-lxml

COPY . ./
RUN npm install && npm run build && rm -rf node_modules
RUN chown -R redash /app
USER redash

ENTRYPOINT ["bin/docker-entrypoint"]
