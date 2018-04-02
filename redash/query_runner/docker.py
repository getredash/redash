"""

References:
 - Custom QueryRunner: https://discuss.redash.io/t/creating-a-new-query-runner-data-source-in-redash/347
 - Docker logo: https://www.docker.com/brand-guidelines
 - Docker-py: https://docker-py.readthedocs.io
 - Docker run: https://docs.docker.com/engine/reference/run/
 - Integration AWS ECR Registry: https://aws.amazon.com/blogs/compute/authenticating-amazon-ecr-repositories-for-docker-cli-with-credential-helper/
 - Docker In Docker (without root): https://forums.docker.com/t/mounting-using-var-run-docker-sock-in-a-container-not-running-as-root/34390
 - Docker overhead: https://gist.github.com/antoinerg/040d35cf08ae68cae14e

TODO:
 - Check if an `exec` approach is feasible without much hassle
 - Explore docker-py lower level API to setup configs and have tighter control
 - Map datasource's extra to HostConfig (https://docs.docker.com/engine/api/v1.18/)
"""
from __future__ import absolute_import

import json
import logging
import os
import shlex

import requests

from redash.query_runner import BaseQueryRunner, register

try:
    import docker
    deps_ok = True
except ImportError:
    deps_ok = False


logger = logging.getLogger(__name__)


class Docker(BaseQueryRunner):

    @classmethod
    def enabled(cls):
        if not deps_ok:
            logger.debug(
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
            # TODO: enabled by default while developing
            return True

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
                    "title": "Environment secrets"
                },
                "args": {
                    "type": "string",
                    "title": "Container arguments"
                },
                "syntax": {
                    "type": "string",
                    "title": "Editor syntax"
                },
                "test": {
                    "type": "string",
                    "title": "Test query"
                },
                "extra": {
                    "type": "string",
                    "title": "Extra Docker options (as JSON)"
                },
            },
            "order": ["image", "env", "secrets", "args", "syntax", "test", "extra"],
            "required": ["image"],
            "secret": ["secrets"]
        }

    def __init__(self, configuration):
        self.configuration = configuration
        self.syntax = configuration.get('syntax', '')

        self.image = configuration['image']

        self.args = shlex.split(configuration.get('args', ''))

        self.env = self.parse_env(configuration.get('env', ''))
        self.env.update(self.parse_env(configuration.get('secrets', '')))

        self.extra = json.loads(configuration.get('extra', '{}'))

    def parse_env(self, env):
        pairs = shlex.split(env)
        return dict(x.split('=', 1) for x in pairs)

    def test_connection(self):
        try:
            client = docker.from_env()
            client.images.get(self.image)
        except docker.errors.ImageNotFound:
            client.images.pull(self.image)

        query = self.configuration.get('test', "")
        data, error = self.run_query(query, None)
        if error is not None:
            raise Exception(error)

    def run_query(self, query, user):
        logger.warn('Query: %s Extra: %s', query, self.extra)

        client = docker.from_env()
        container = client.containers.create(
            self.image,
            auto_remove=False,  # the container might finish too soon
            tty=False,
            detach=False,
            stdin_open=True,
            environment=self.env,
            command=self.args,
            labels={
                'io.redash.query': query,
                'io.redash.user.id': unicode(user.id) if user else 'n/a',
                'io.redash.user.email': user.email if user else 'n/a',
                'io.redash.user.org_id': unicode(user.org_id) if user else 'n/a',
            },
            **self.extra)

        logger.info(
            'Created container <%s> (%s) from image <%s>',
            container.name,
            container.id,
            self.configuration['image'])

        try:
            container.start()
            logger.info('Started')

            socket = container.attach_socket(params={'stdin': 1, 'stream': 1})

            # TODO: TLS Docker daemons require a different approach
            data = query.encode()
            written = os.write(socket.fileno(), data)
            if written != len(data):
                logger.warn('Unable to write the whole data: %s (wanted %s)', written, len(data))

            socket.close()

            logger.info('Query sent')

            result = container.wait(timeout=30)  # TODO: Make timeout configurable?
            logger.info('Waited')

            # TODO: collect both in one call?
            # FIXME: Both seem to provide the same info
            stdout = container.logs(stdout=True)
            logger.info('Logs STDOUT %s', stdout)
            stderr = container.logs(stderr=True)
            logger.info('Logs STDERR %s', stderr)

            try:
                container.remove()
            except requests.exceptions.HTTPError as e:
                if e.response.status_code == 404:
                    pass
                raise
            logger.info('Remove')

            if result['StatusCode'] != 0:
                return None, 'Execution terminated with an error {}'.format(result['StatusCode'])

            # TODO: parse stdout JSON
            return None, stdout

        except requests.exceptions.ReadTimeout:
            logger.warn('Timeout waiting for <%s>, forcing removal', container.id)
            try:
                container.remove(force=True)
            except requests.exceptions.HTTPError as e:
                if e.response.status_code == 404:
                    pass
                return None, unicode(e)

            return None, 'Timeout waiting for execution to end'
        except Exception as e:
            logger.warn('Container <%s> failed: %s', container.id, e)
            return None, unicode(e)


register(Docker)
