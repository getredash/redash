import contextlib
import json
from redash import models
from flask.ext.script import Manager


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
        query_result = self.import_query_result(query['latest_query_data'])

        new_query = self._get_or_create(models.Query, query['id'], name=query['name'],
                                        user=user,
                                        ttl=-1,
                                        query=query['query'],
                                        query_hash=query['query_hash'],
                                        description=query['description'],
                                        latest_query_data=query_result,
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
        visualization = self.import_visualization(dashboard.user, widget['visualization'])

        new_widget = self._get_or_create(models.Widget, widget['id'],
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
def importer_with_mapping_file(mapping_filename):
    with open(mapping_filename) as f:
        mapping = json.loads(f.read())

    importer = Importer(object_mapping=mapping, data_source=get_data_source())
    yield importer

    with open(mapping_filename, 'w') as f:
        f.write(json.dumps(importer.object_mapping, indent=2))


def get_data_source():
    try:
        data_source = models.DataSource.get(models.DataSource.name=="Import")
    except models.DataSource.DoestNotExist:
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
def dashboard(mapping_filename, dashboard_filename, user_id):
    user = models.User.get_by_id(user_id)
    with open(dashboard_filename) as f:
        dashboard = json.loads(f.read())

    with importer_with_mapping_file(mapping_filename) as importer:
        importer.import_dashboard(user, dashboard)



