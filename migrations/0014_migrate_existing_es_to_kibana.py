__author__ = 'lior'

from redash.models import DataSource

if __name__ == '__main__':

    for ds in DataSource.select(DataSource.id, DataSource.type):
        if ds.type == 'elasticsearch':
            ds.type = 'kibana'
            ds.save(only=ds.dirty_fields)
