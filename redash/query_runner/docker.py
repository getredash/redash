"""
Query runner for Docker images.

Allows to run arbitrary code with the well defined isolation of containers.

The communication is done via standard streams using UTF-8 encoding. The
query is provided over stdin, the results are expected on stdout and any
errors should be writen to stderr.

Supported formats for providing the results:

 - Json (see https://discuss.redash.io/t/creating-a-new-query-runner-data-source-in-redash/347)
 - CSV (either with commas or tabs)

Regardless of the format a normalization pass is performed to enrich the
result with type information based on the column values. It also supports
deriving a type from the column names by using the `name:type` pattern.

"""
from __future__ import absolute_import

import os
import logging
import json
import shlex
import csv

import requests
import dateutil

from redash.query_runner import BaseQueryRunner, register, \
                                TYPE_INTEGER, TYPE_FLOAT, TYPE_DATETIME, \
                                TYPE_STRING, TYPE_BOOLEAN


try:
    import docker
    deps_ok = True
except ImportError:
    deps_ok = False


logger = logging.getLogger(__name__)


def parse_result(result):
    try:
        result = result.decode('utf-8')
    except UnicodeDecodeError as e:
        raise ValueError(unicode(e))

    result = result.strip()
    if result.startswith('{'):
        data = json.loads(result)
    else:
        lines = result.split('\n')
        delimiter = '\t' if '\t' in lines[0] else ','
        headers, rows = [], []
        for row in csv.reader(lines, delimiter=delimiter):
            if not headers:
                headers = [c.strip() for c in row]
                continue

            rows.append(
                {headers[i]: c.strip() for i,c in enumerate(row[:len(headers)])}
            )

        data = {
            'columns': [{'name': h} for h in headers],
            'rows': rows
        }

    normalize_data_mut(data)
    return data


def normalize_data_mut(data):
    for column in data['columns']:
        name = column['name']
        parts = name.split(':', 1)

        # Cast to string and remove type hint
        column['name'] = parts[0]
        for row in data['rows']:
            row[parts[0]] = unicode(row.get(name, ''))
            if name != parts[0]:
                del row[name]

        name = parts[0]
        type = parts[1] if len(parts) == 2 else None
        if type:
            column['type'] = type
        elif 'type' not in column:
            column['type'] = guess_type([r.get(name) for r in data['rows']])

        if 'friendly_name' not in column:
            column['friendly_name'] = name.replace('_', ' ').title()

def guess_type(values):
    def check(cb, *args):
        try:
            cb(*args)
            return True
        except:
            return False

    def boolstr(v):
        return v.lower() in ('true', 'false')

    if not filter(len, values):
        return TYPE_STRING

    if all(check(int, x) for x in values):
        return TYPE_INTEGER
    elif all(check(float, x) for x in values):
        return TYPE_FLOAT
    elif all(boolstr(x) for x in values):
        return TYPE_BOOLEAN
    elif all(check(dateutil.parser.parse, x) for x in values):
        return TYPE_DATETIME
    else:
        return TYPE_STRING


class Docker(BaseQueryRunner):

    @classmethod
    def enabled(cls):
        if not deps_ok:
            logger.warning(
                'Disabling Docker query runner. '
                'Dependencies missing: pip install docker')
            return False

        try:
            client = docker.from_env()
            client.ping()
            logger.debug(
                'Enabling Docker query runner for %s', client.api.base_url)
            return True
        except Exception as ex:
            logger.warn(
                'Disabling Docker query runner. '
                'Unable to connect to Docker Daemon at %s: %s',
                client.api.base_url, ex)
            return False

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "image": {
                    "type": "string",
                    "title": "Docker image"
                },
                "env": {
                    "type": "string",
                    "title": "Environment"
                },
                "secrets": {
                    "type": "string",
                    "title": "Environment secrets",
                    "help": "Place here sensitive environment variables."
                },
                "command": {
                    "type": "string",
                    "title": "Command"
                },
                "syntax": {
                    "type": "string",
                    "title": "Editor syntax",
                },
                "test": {
                    "type": "string",
                    "title": "Test input",
                    "help": "Use it if your image requires some input to work.",
                },
                "extra": {
                    "type": "string",
                    "title": "Additional Docker-py options",
                    "help": "JSON with values to be used for Container.create()"
                },
            },
            "order": ["image", "env", "secrets", "command", "syntax", "test", "extra"],
            "required": ["image"],
            "secret": ["secrets"],
            "multiline": ["env", "secrets", "test", "extra"],
            "link": 'https://github.com/getredash/redash/pull/2435/files',
        }

    @classmethod
    def annotate_query(cls):
        return False

    def __init__(self, config):
        self.configuration = config
        self.syntax = config.get('syntax', '')

        self.image = config['image']
        self.command = config.get('command', '')

        self.env = self.parse_env(config.get('env', ''))
        self.env.update(self.parse_env(config.get('secrets', '')))

        self.extra = json.loads(config.get('extra', '{}'))

    def parse_env(self, env):
        # Ensure it's utf-8 data, otherwise the call will fail
        if isinstance(env, unicode):
            env = env.encode('utf-8')

        pairs = shlex.split(env)
        return dict(x.split('=', 1) for x in pairs)

    def test_connection(self):
        try:
            client = docker.from_env()
            client.images.get(self.image)
        except docker.errors.ImageNotFound:
            logger.info('Image <%s> not found, trying to pull it from repository',
                        self.image)
            client.images.pull(self.image)

        query = self.configuration.get('test', "")
        data, error = self.run_query(query, None)
        if error is not None:
            raise Exception(error)

    def run_query(self, query, user):
        client = docker.from_env()
        container = client.containers.create(
            self.image,
            auto_remove=False,  # the container may finish too soon!
            tty=False,
            detach=False,
            stdin_open=True,
            environment=self.env,
            command=self.command,
            labels={
                'io.redash.query': query,
                'io.redash.user.id': unicode(user.id) if user else 'n/a',
                'io.redash.user.email': user.email if user else 'n/a',
                'io.redash.user.org_id': unicode(user.org_id) if user else 'n/a',
            },
            **self.extra)

        logger.info(
            'Running container <%s> (%s) from image <%s>',
            container.name,
            container.id,
            self.configuration['image'])

        try:
            container.start()

            # Send query via stdin
            encoded = query.encode('utf-8')
            socket = container.attach_socket(params={'stdin': 1, 'stream': 1})
            written = os.write(socket.fileno(), encoded)
            if written != len(encoded):
                logger.warn('Unable to write the whole data: %s (wanted %s)', written, len(encoded))
            socket.close()

            result = container.wait(timeout=30)  # TODO: Make timeout configurable?

            # Right now the demuxing of both streams in a single iterator
            # is not implemented on docker-py so the only way is to query two
            # times to get them, but then we loose the ordering.
            stdout = container.logs(stdout=True, stderr=False)
            stderr = container.logs(stdout=False, stderr=True)

            if result['StatusCode'] != 0:
                if not stderr:
                    stderr = stdout

                lines = stderr.split('\n')
                stderr = '\n'.join(lines[-15:])

                logger.warn('Logs: %s', stderr)
                return None, 'Execution terminated with an error ({}):\n{}'.format(result['StatusCode'], stderr)

            try:
                data = parse_result(stdout)
            except ValueError:
                logger.warn('Malformed result: %s', stdout)
                return None, 'Malformed result:\n{}'.format(stdout)

            return json.dumps(data, separators=(',',':')), None

        except requests.exceptions.ReadTimeout:
            logger.warn('Timeout waiting for <%s>, forcing removal', container.id)
            return None, 'Timeout waiting for execution to end'
        except Exception as e:
            logger.warn('Container <%s> failed: %s', container.id, e)
            return None, unicode(e)

        finally:
            # Clean up but ignore if the container does not exists
            try:
                container.remove(force=True)
            except requests.exceptions.HTTPError as e:
                if e.response.status_code != 404:
                    return None, unicode(e)


register(Docker)
