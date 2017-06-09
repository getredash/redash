FROM redash/base:latest

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    libboost-all-dev \
    unixodbc-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# We first copy only the requirements file, to avoid rebuilding on every file
# change.
COPY requirements.txt requirements_dev.txt requirements_all_ds.txt ./
RUN pip install -r requirements.txt -r requirements_dev.txt -r requirements_all_ds.txt

COPY . ./
RUN npm install && npm run build && rm -rf node_modules
RUN chown -R redash /app
USER redash

COPY exasol_odbc/ /etc/

ENTRYPOINT ["/app/bin/docker-entrypoint"]
CMD ["server"]