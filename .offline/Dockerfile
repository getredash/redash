FROM redash/base:latest

COPY . ./
RUN tar -P -xvf .offline/artifact.tar
RUN pip install --no-index --find-links=".tmp/pip" -r requirements.txt -r requirements_dev.txt -r requirements_all_ds.txt
RUN chown -R redash /app
USER redash

ENTRYPOINT ["/app/bin/docker-entrypoint"]
CMD ["server"]
