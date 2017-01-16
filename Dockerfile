FROM redash/base:latest

# Webpack dev server
EXPOSE 8080

# We first copy only the requirements file, to avoid rebuilding on every file
# change.
COPY requirements.txt requirements_dev.txt requirements_all_ds.txt ./
RUN pip install -r requirements.txt -r requirements_dev.txt -r requirements_all_ds.txt

COPY package.json ./
RUN npm install

COPY . ./
RUN npm run build

ENTRYPOINT ["/app/bin/docker-entrypoint"]
