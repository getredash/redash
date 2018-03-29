FROM redash/base:latest

# We first copy only the requirements file, to avoid rebuilding on every file
# change.
COPY requirements.txt requirements_dev.txt requirements_all_ds.txt ./
RUN pip install -r requirements.txt -r requirements_dev.txt -r requirements_all_ds.txt

COPY . ./
RUN npm install && npm run build && rm -rf node_modules

# Prepare for mounting the host's docker socket, when actually mounted it
# should inherit the permissions set here and allow the redash user to connect.
RUN touch /var/run/docker.sock \
 && chown redash:redash /var/run/docker.sock

RUN chown -R redash /app
USER redash

ENTRYPOINT ["/app/bin/docker-entrypoint"]
CMD ["server"]