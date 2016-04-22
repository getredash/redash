import json
import bson
import logging
from redash import models
from redash.wsgi import app
from redash import utils


# Wrap all the ORM classes in a dictionary, so that we can access them by
# generically by name
MODELS = {
    'dashboards': models.Dashboard,
    'widgets': models.Widget,
    'visualizations': models.Visualization,
    'queries': models.Query
}

# Initialize a structure containing foreign keys that may vary during the
# dashboard insertion process. This is used to keep track of all ids before and
# after insertion.
FOREIGN_KEYS = {
    'dashboards': [],
    'queries': [],
    'visualizations': [{'model': 'queries', 'field': 'query_id'}],
    'widgets': [
        {'model': 'dashboards', 'field': 'dashboard'},
        {'model': 'visualizations', 'field': 'visualization'}
    ]
}




def do_insert(model, items, id_mappings, fk_mapping, actions):
    """
    :param model: Model name (dashboards, widgets, visualizations, queries)
    :param items: data
    :param id_mappings: Dictionary with mappings of original to new ids.
       ej:  {
               'dashboard' {
                   <old_id>: <new_id>,
                   ...
                },
                ...
            }
    :param fk_mapping: List of references in table as pairs (model & filed)
        ie:  [{model: 'dashboards', field: 'dashboard_id'}, ...]
    :param actions: Dictionary of actions
    """
    # If items contains timestamps, create a new object, so that peewee doesn't
    # complain. TODO: Use the incoming date instead of now()
    for item in items:
        if 'created_at' in item:
            item['created_at'] = utils.utcnow()
        if 'updated_at' in item:
            item['updated_at'] = utils.utcnow()

    # Filter items that will be reused, so that they're not inserted.
    to_be_inserted = [i for i in items if actions[model][str(i['id'])] != 'reuse']

    # Store original IDs to later update the id mapping structure.
    original_ids = [i['id'] for i in to_be_inserted]
    reused = [i['id'] for i in items if actions[model][str(i['id'])] == 'reuse']

    # Prepare items for insertions (update ids, and foreign keys)
    for item in to_be_inserted:
        # If the item about to be inserted is in conflicts and requires a new
        # Id, we remove the id field prior to insertion
        if actions[model][str(item['id'])] == 'new':
            item.pop('id')

        # Adjust foreign keys so that the match the items that have a new id
        for fk in fk_mapping:
            ref_id = item[fk['field']]

            # If the attribute is not referencing another object, just skip to
            # the next  one.
            if ref_id is None:
                continue

            # If the referenced item was created with a new ID, update the
            # reference in this item prior to inserting it.
            app.logger.error(actions[fk['model']].keys())
            app.logger.error(id_mappings[fk['model']].keys())
            # FIXME: ID keys in action object are received as string, fix this
            # before it breaks something, instead of re-converting here.
            if actions[fk['model']][str(ref_id)] == 'new':
                item[fk['field']] = id_mappings[fk['model']][ref_id]

    # If there's actually something to be inserted, do it.
    if to_be_inserted:
        qtr = MODELS[model].insert_many(to_be_inserted).return_id_list()
        new_ids = qtr.execute()
    else:
        new_ids = {}

    # Return a dictionary with the old ids, and the current ids
    _local_id_mapping = dict(zip(original_ids, new_ids))

    # Add reused elements to id mappings
    _local_id_mapping.update({i: i for i in reused})

    return _local_id_mapping


def update_dashboard_widget_references(id, id_mappings):
    """
    This method creates a new layout object with accurate refrences to the
    widgets after everything else has been inserted.

    :param id: Dashboard id
    :param id_mappings: dict object containing a mapping of the type {old:new}
      for each item involved in this dashboard
    """
    # Update widget references in layout field so that they point to the
    # recently inserted ones.
    dash = next(models.Dashboard.select().where(models.Dashboard.id == id).execute())
    new_layout = [
        [id_mappings['widgets'][i] for i in row]
        for row in json.loads(dash.layout)
    ]
    dash.layout = json.dumps(new_layout)
    dash.save()


def import_dashboard(data, actions):
    """
    Iterates thru all the items (in a specific order), updating the id_mapping
    structure, as each item gets inserted.
    Then updates the dashboard layout to reference the newly inserted widgets.
    Everything gets done within the context of a transaction, to be able to
    rollback in case something goes wrong and prevent the database from being
    left in an inconsistent state.
    Returns a json string specifying whether the operation was successful or
    not.

    :param data: data to be inserted
    :param actions: what to do with eac item: new, reuse, insert (previously
      unexisting)
    """
    # Initializa en empty id_mappings structure
    id_mappings = {
        'dashboards' : {},
        'widgets': {},
        'visualizations': {},
        'queries': {}
    }


    # Wrap everything inside an atomic operation, so that the dashboards
    # will not be left in an unexpected state.
    with models.db.database.atomic() as atx:
        try:
            # Insert all items
            for model in ('dashboards', 'queries', 'visualizations', 'widgets'):
                id_mappings[model].update(do_insert(
                    model,
                    data[model],
                    id_mappings,
                    FOREIGN_KEYS[model],
                    actions
                ))

            # Update widget references in new dashboards
            for dash_id in id_mappings['dashboards'].values():
                update_dashboard_widget_references(dash_id, id_mappings)

#            # TODO: REMOVE THIS FORCED ROLLBACK!
#            dbs = [d for d in models.Dashboard.select().dicts().where(
#                models.Dashboard.id << id_mappings['dashboards'].values()
#            )]
#            atx.rollback()
#
#            return json.dumps(
#                {'mapping': id_mappings, 'dashboards': dbs},
#                default=bson.json_util.default
#            )

        except Exception as e:
            # If anything goes wrong, we rollback all the recent changes.
            logging.exception("Something went wrong... Will rollback.")
            atx.rollback()
            return '{"status": "ERROR", "message": "Something went wrong"}'

        return '{"status": "OK", "message": "Dashboard imported successfully"}'
