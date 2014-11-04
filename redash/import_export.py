import contextlib
import json
import logging
import os
from redash import models
from flask.ext.script import Manager

logger = logging.getLogger()

class Importer(object):
    def __init__(self, object_mapping=None, data_source=None):
        if object_mapping is None:
            object_mapping = {}
        self.object_mapping = object_mapping
        self.data_source = data_source

    def import_query_result(self, query_result):
        query_result = self._get_or_create(models.QueryResult, query_result['id'],
                                           data_source=self.data_source,
                                           data=json.dumps(query_result['data']),
                                           query_hash=query_result['query_hash'],
                                           retrieved_at=query_result['retrieved_at'],
                                           query=query_result['query'],
                                           runtime=query_result['runtime'])

        return query_result

    def import_query(self, user, query):
        new_query = self._get_or_create(models.Query, query['id'], name=query['name'],
                                        user=user,
                                        ttl=-1,
                                        query=query['query'],
                                        query_hash=query['query_hash'],
                                        description=query['description'],
                                        data_source=self.data_source)

        return new_query

    def import_visualization(self, user, visualization):
        query = self.import_query(user, visualization['query'])

        new_visualization = self._get_or_create(models.Visualization, visualization['id'],
                                                name=visualization['name'],
                                                description=visualization['description'],
                                                type=visualization['type'],
                                                options=json.dumps(visualization['options']),
                                                query=query)
        return new_visualization

    def import_widget(self, dashboard, widget):
        if 'visualization' in widget:
            visualization = self.import_visualization(dashboard.user, widget['visualization'])
        else:
            visualization = None

        new_widget = self._get_or_create(models.Widget, widget['id'],
                                         text=widget.get('text', None),
                                         dashboard=dashboard,
                                         width=widget['width'],
                                         options=json.dumps(widget['options']),
                                         visualization=visualization)

        return new_widget

    def import_dashboard(self, user, dashboard):
        """
        Imports dashboard along with widgets, visualizations and queries from another re:dash.

        user - the user to associate all objects with.
        dashboard - dashboard to import (can be result of loading a json output).
        """

        new_dashboard = self._get_or_create(models.Dashboard, dashboard['id'],
                                            name=dashboard['name'],
                                            slug=dashboard['slug'],
                                            layout='[]',
                                            user=user)

        layout = []

        for widgets in dashboard['widgets']:
            row = []
            for widget in widgets:
                widget_id = self.import_widget(new_dashboard, widget).id
                row.append(widget_id)

            layout.append(row)

        new_dashboard.layout = json.dumps(layout)
        new_dashboard.save()

        return new_dashboard

    def _get_or_create(self, object_type, external_id, **properties):
        internal_id = self._get_mapping(object_type, external_id)
        logger.info("Creating %s with external id: %s and internal id: %s", object_type, external_id, internal_id)
        if internal_id:
            update = object_type.update(**properties).where(object_type.id == internal_id)
            update.execute()
            obj = object_type.get_by_id(internal_id)
        else:
            obj = object_type.create(**properties)
            self._update_mapping(object_type, external_id, obj.id)

        return obj

    def _get_mapping(self, object_type, external_id):
        self.object_mapping.setdefault(object_type.__name__, {})
        return self.object_mapping[object_type.__name__].get(str(external_id), None)

    def _update_mapping(self, object_type, external_id, internal_id):
        self.object_mapping.setdefault(object_type.__name__, {})
        self.object_mapping[object_type.__name__][str(external_id)] = internal_id

import_manager = Manager(help="import utilities")
export_manager = Manager(help="export utilities")


@contextlib.contextmanager
def importer_with_mapping_file(mapping_filename, data_source_id=None):
    # Touch file in case it doesn't exists
    if not os.path.isfile(mapping_filename):
        with open(mapping_filename, 'w') as f:
            f.write("{}")

    with open(mapping_filename) as f:
        mapping = json.loads(f.read())

    if data_source_id is not None:
        data_source = models.DataSource.get_by_id(data_source_id)
    else:
        data_source = get_data_source()

    importer = Importer(object_mapping=mapping, data_source=data_source)
    yield importer

    with open(mapping_filename, 'w') as f:
        f.write(json.dumps(importer.object_mapping, indent=2))


def get_data_source():
    try:
        data_source = models.DataSource.get(models.DataSource.name=="Import")
    except models.DataSource.DoesNotExist:
        data_source = models.DataSource.create(name="Import", type="import", options='{}')

    return data_source

@import_manager.command
def query(mapping_filename, query_filename, user_id):
    user = models.User.get_by_id(user_id)
    with open(query_filename) as f:
        query = json.loads(f.read())

    with importer_with_mapping_file(mapping_filename) as importer:
        imported_query = importer.import_query(user, query)

        print "New query id: {}".format(imported_query.id)


@import_manager.command
def dashboard(mapping_filename, dashboard_filename, user_id, data_source_id=None):
    user = models.User.get_by_id(user_id)

    with open(dashboard_filename) as f:
        dashboard = json.loads(f.read())

    with importer_with_mapping_file(mapping_filename, data_source_id) as importer:
        importer.import_dashboard(user, dashboard)



