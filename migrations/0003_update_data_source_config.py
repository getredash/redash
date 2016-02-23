import json
import jsonschema
from jsonschema import ValidationError

from redash import query_runner
from redash.models import DataSource


def validate_configuration(query_runner_type, configuration_json):
    query_runner_class = query_runner.query_runners.get(query_runner_type, None)
    if query_runner_class is None:
        return False

    try:
        if isinstance(configuration_json, basestring):
            configuration = json.loads(configuration_json)
        else:
            configuration = configuration_json
        jsonschema.validate(configuration, query_runner_class.configuration_schema())
    except (ValidationError, ValueError):
        return False

    return True

def update(data_source):
    print "[%s] Old options: %s" % (data_source.name, data_source.options)

    if validate_configuration(data_source.type, data_source.options):
        print "[%s] configuration already valid. skipping." % data_source.name
        return

    if data_source.type == 'pg':
        values = data_source.options.split(" ")
        configuration = {}
        for value in values:
            k, v = value.split("=", 1)
            configuration[k] = v
            if k == 'port':
                configuration[k] = int(v)

        data_source.options = json.dumps(configuration)

    elif data_source.type == 'mysql':
        mapping = {
            'Server': 'host',
            'User': 'user',
            'Pwd': 'passwd',
            'Database': 'db'
        }

        values = data_source.options.split(";")
        configuration = {}
        for value in values:
            k, v = value.split("=", 1)
            configuration[mapping[k]] = v
        data_source.options = json.dumps(configuration)

    elif data_source.type == 'graphite':
        old_config = json.loads(data_source.options)

        configuration = {
            "url": old_config["url"]
        }

        if "verify" in old_config:
            configuration['verify'] = old_config['verify']

        if "auth" in old_config:
            configuration['username'], configuration['password'] = old_config["auth"]

        data_source.options = json.dumps(configuration)

    elif data_source.type == 'url':
        data_source.options = json.dumps({"url": data_source.options})

    elif data_source.type == 'script':
        data_source.options = json.dumps({"path": data_source.options})

    elif data_source.type == 'mongo':
        data_source.type = 'mongodb'

    else:
        print "[%s] No need to convert type of: %s" % (data_source.name, data_source.type)

    print "[%s] New options: %s" % (data_source.name, data_source.options)
    data_source.save(only=data_source.dirty_fields)


if __name__ == '__main__':
    for data_source in DataSource.select(DataSource.id, DataSource.name, DataSource.type, DataSource.options):
        update(data_source)
