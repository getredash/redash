FROM redash/base:latest

# We first copy only the requirements file, to avoid rebuilding on every file
# change.
COPY requirements.txt requirements_dev.txt requirements_all_ds.txt ./
RUN pip install -r requirements.txt -r requirements_dev.txt -r requirements_all_ds.txt

COPY . ./

# Upgrade node to LTS 6.11.2
RUN cd ~
RUN wget https://nodejs.org/download/release/v6.11.2/node-v6.11.2-linux-x64.tar.gz
RUN sudo tar --strip-components 1 -xzvf node-v* -C /usr/local

# Upgrade npm
RUN npm upgrade npm

RUN npm install && npm run build && rm -rf node_modules
RUN chown -R redash /app
USER redash

ENTRYPOINT ["/app/bin/docker-entrypoint"]
