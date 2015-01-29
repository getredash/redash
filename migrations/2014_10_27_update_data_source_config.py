import json

from redash.models import DataSource


def update(data_source):
    print "[%s] Old options: %s" % (data_source.name, data_source.options)
    if data_source.type == 'pg':
        values = data_source.options.split(" ")
        configuration = {}
        for value in values:
            k, v = value.split("=", 1)
            configuration[k] = v
        data_source.options = json.dumps(configuration)

    elif data_source.type == 'mysql':
        values = data_source.options.split(";")
        configuration = {}
        for value in values:
            k, v = value.split("=", 1)
            configuration[k] = v
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
    data_source.save()


if __name__ == '__main__':
    for data_source in DataSource.all():
        update(data_source)