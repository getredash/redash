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
def new(name, type, options):
    """Create new data source"""
    # TODO: validate it's a valid type and in the future, validate the options.
    print "Creating {} data source ({}) with options:\n{}".format(type, name, options)
    data_source = models.DataSource.create(name=name,
                                           type=type,
                                           options=options)
    print "Id: {}".format(data_source.id)
