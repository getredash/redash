import click
from flask.ext.script import Manager
from redash import models

manager = Manager(help="Data sources management commands.")

@manager.command
def list():
    """List currently configured data sources"""
    for i, ds in enumerate(models.DataSource.select()):
        if i > 0:
            print "-"*20

        print "Id: {}\nName: {}\nType: {}\nOptions: {}".format(ds.id, ds.name, ds.type, ds.options)


@manager.command
def new(name=None, type=None, options=None):
    """Create new data source"""

    import json
    from redash.query_runner import query_runners, validate_configuration

    if name is None:
        name = click.prompt("Name")

    if type is None:
        print "Select type:"
        for i, query_runner_name in enumerate(query_runners.keys()):
            print "{}. {}".format(i+1, query_runner_name)

        idx = 0
        while idx < 1 or idx > len(query_runners.keys()):
            idx = click.prompt("[{}-{}]".format(1, len(query_runners.keys())), type=int)

        type = query_runners.keys()[idx-1]
    elif type not in query_runners.keys():
        print "Error: type not supported (supported types: {})".format(", ".join(query_runners.keys()))
        exit()

    if options is None:
        query_runner = query_runners[type]
        schema = query_runner.configuration_schema()

        types = {
            'string': unicode,
            'number': int,
            'boolean': bool
        }

        options_obj = {}

        for k, prop in schema['properties'].iteritems():
            required = k in schema.get('required', [])
            default_value = "<<DEFAULT_VALUE>>"
            if required:
                default_value = None

            prompt = prop.get('title', k.capitalize())
            if required:
                prompt = "{} (required)".format(prompt)
            else:
                prompt = "{} (optional)".format(prompt)

            value = click.prompt(prompt, default=default_value, type=types[prop['type']], show_default=False)
            if value != default_value:
                options_obj[k] = value

        options = json.dumps(options_obj)

    if not validate_configuration(type, options):
        print "Error: invalid configuration."
        exit()

    print "Creating {} data source ({}) with options:\n{}".format(type, name, options)

    data_source = models.DataSource.create(name=name,
                                           type=type,
                                           options=options)
    print "Id: {}".format(data_source.id)


@manager.command
def delete(name):
    """Deletes data source by name"""
    try:
        data_source = models.DataSource.get(models.DataSource.name==name)
        print "Deleting data source: {} (id={})".format(name, data_source.id)
        data_source.delete_instance()
    except models.DataSource.DoesNotExist:
        print "Couldn't find data source named: {}".format(name)


def update_attr(obj, attr, new_value):
    if new_value is not None:
        old_value = getattr(obj, attr)
        print "Updating {}: {} -> {}".format(attr, old_value, new_value)
        setattr(obj, attr, new_value)


@manager.option('name', default=None, help="name of data source to edit")
@manager.option('--name', dest='new_name', default=None, help="new name for the data source")
@manager.option('--options', dest='options', default=None, help="updated options for the data source")
@manager.option('--type', dest='type', default=None, help="new type for the data source")
def edit(name, new_name=None, options=None, type=None):
    """Edit data source settings (name, options, type)"""
    try:
        data_source = models.DataSource.get(models.DataSource.name==name)
        update_attr(data_source, "name", new_name)
        update_attr(data_source, "type", type)
        update_attr(data_source, "options", options)
        data_source.save()

    except models.DataSource.DoesNotExist:
        print "Couldn't find data source named: {}".format(name)

