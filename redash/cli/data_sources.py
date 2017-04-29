from sys import exit
import json

import click
from flask.cli import AppGroup
from sqlalchemy.orm.exc import NoResultFound

from redash import models
from redash.query_runner import query_runners
from redash.query_runner import get_configuration_schema_for_query_runner_type
from redash.utils.configuration import ConfigurationContainer

manager = AppGroup(help="Data sources management commands.")


@manager.command()
@click.option('--org', 'organization', default=None,
              help="The organization the user belongs to (leave blank for "
              "all organizations).")
def list(organization=None):
    """List currently configured data sources."""
    if organization:
        org = models.Organization.get_by_slug(organization)
        data_sources = models.DataSource.query.filter(
            models.DataSource.org == org)
    else:
        data_sources = models.DataSource.query
    for i, ds in enumerate(data_sources):
        if i > 0:
            print "-" * 20

        print "Id: {}\nName: {}\nType: {}\nOptions: {}".format(
            ds.id, ds.name, ds.type, ds.options.to_json())


def validate_data_source_type(type):
    if type not in query_runners.keys():
        print ("Error: the type \"{}\" is not supported (supported types: {})."
               .format(type, ", ".join(query_runners.keys())))
        print "OJNK"
        exit(1)


@manager.command()
@click.argument('name')
@click.option('--org', 'organization', default='default',
              help="The organization the user belongs to "
              "(leave blank for 'default').")
def test(name, organization='default'):
    """Test connection to data source by issuing a trivial query."""
    try:
        org = models.Organization.get_by_slug(organization)
        data_source = models.DataSource.query.filter(
            models.DataSource.name == name,
            models.DataSource.org == org).one()
        print "Testing connection to data source: {} (id={})".format(
            name, data_source.id)
        try:
            data_source.query_runner.test_connection()
        except Exception, e:
            print "Failure: {}".format(e)
            exit(1)
        else:
            print "Success"
    except NoResultFound:
        print "Couldn't find data source named: {}".format(name)
        exit(1)


@manager.command()
@click.argument('name', default=None, required=False)
@click.option('--type', default=None,
              help="new type for the data source")
@click.option('--options', default=None,
              help="updated options for the data source")
@click.option('--org', 'organization', default='default',
              help="The organization the user belongs to (leave blank for "
              "'default').")
def new(name=None, type=None, options=None, organization='default'):
    """Create new data source."""

    if name is None:
        name = click.prompt("Name")

    if type is None:
        print "Select type:"
        for i, query_runner_name in enumerate(query_runners.keys()):
            print "{}. {}".format(i + 1, query_runner_name)

        idx = 0
        while idx < 1 or idx > len(query_runners.keys()):
            idx = click.prompt("[{}-{}]".format(1, len(query_runners.keys())),
                               type=int)

        type = query_runners.keys()[idx - 1]
    else:
        validate_data_source_type(type)

    query_runner = query_runners[type]
    schema = query_runner.configuration_schema()

    if options is None:
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

            value = click.prompt(prompt, default=default_value,
                                 type=types[prop['type']], show_default=False)
            if value != default_value:
                options_obj[k] = value

        options = ConfigurationContainer(options_obj, schema)
    else:
        options = ConfigurationContainer(json.loads(options), schema)

    if not options.is_valid():
        print "Error: invalid configuration."
        exit()

    print "Creating {} data source ({}) with options:\n{}".format(
        type, name, options.to_json())

    data_source = models.DataSource.create_with_group(
        name=name, type=type, options=options,
        org=models.Organization.get_by_slug(organization))
    models.db.session.commit()
    print "Id: {}".format(data_source.id)


@manager.command()
@click.argument('name')
@click.option('--org', 'organization', default='default',
              help="The organization the user belongs to (leave blank for "
              "'default').")
def delete(name, organization='default'):
    """Delete data source by name."""
    try:
        org = models.Organization.get_by_slug(organization)
        data_source = models.DataSource.query.filter(
            models.DataSource.name == name,
            models.DataSource.org == org).one()
        print "Deleting data source: {} (id={})".format(name, data_source.id)
        models.db.session.delete(data_source)
        models.db.session.commit()
    except NoResultFound:
        print "Couldn't find data source named: {}".format(name)
        exit(1)


def update_attr(obj, attr, new_value):
    if new_value is not None:
        old_value = getattr(obj, attr)
        print "Updating {}: {} -> {}".format(attr, old_value, new_value)
        setattr(obj, attr, new_value)


@manager.command()
@click.argument('name')
@click.option('--name', 'new_name', default=None,
              help="new name for the data source")
@click.option('--options', default=None,
              help="updated options for the data source")
@click.option('--type', default=None,
              help="new type for the data source")
@click.option('--org', 'organization', default='default',
              help="The organization the user belongs to (leave blank for "
              "'default').")
def edit(name, new_name=None, options=None, type=None, organization='default'):
    """Edit data source settings (name, options, type)."""
    try:
        if type is not None:
            validate_data_source_type(type)
        org = models.Organization.get_by_slug(organization)
        data_source = models.DataSource.query.filter(
            models.DataSource.name == name,
            models.DataSource.org == org).one()
        update_attr(data_source, "name", new_name)
        update_attr(data_source, "type", type)

        if options is not None:
            schema = get_configuration_schema_for_query_runner_type(
                data_source.type)
            options = json.loads(options)
            data_source.options.set_schema(schema)
            data_source.options.update(options)

        models.db.session.add(data_source)
        models.db.session.commit()

    except NoResultFound:
        print "Couldn't find data source named: {}".format(name)
