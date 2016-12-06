from flask_script import Manager, prompt_pass
from peewee import IntegrityError

from redash import models

manager = Manager(help="Queries management commands.")


def get_query(query_id, org):
    try:
        query = models.Query.get_by_id_and_org(query_id, org)
        return query
    except models.Query.DoesNotExist, e:
        print "Query ID '{}' not found on organization '{}'".format(query_id, org.name)
        exit()

        

def get_query_vis(query_id, org):
    visualizations = models.Visualization.get_by_query_id_and_org(query_id, org)
    return visualizations


@manager.option('query_id', help="Query ID")
@manager.option('--set_author', dest='author_id', default=None, help="The user id that will be the owner of the new query")
@manager.option('--org', dest='organization', default='default', help="Organization that has the query")
@manager.option('--org_dest', dest='organization_dest', default='default', help="Organization that has the query")
def fork(query_id, author_id=None, organization='default', organization_dest='default'):
    org = models.Organization.get_by_slug(organization)
    org_dest = models.Organization.get_by_slug(organization_dest)
    query = get_query(query_id, org)
    visualizations = get_query_vis(query_id, org)

    print "Forking query \"{}\" in organization '{}'...".format(query.name, org.name)

    # create the new query definitions based on the old
    query_def = query.to_dict()
    data_source = models.DataSource.get_by_id_and_org(query_def['data_source_id'], org)

    for field in ['id', 'created_at', 'api_key', 'visualizations', 
        'latest_query_data', 'latest_query_data_id', 'last_modified_by', 'data_source_id']:
        query_def.pop(field, None)

    query_def['user'] = query.user.id if author_id is None else author_id
    query_def['name'] = "Copy of {} #{}".format(query_def['name'], query_id)
    query_def['data_source'] = data_source
    query_def['org'] = org_dest
    new_query = models.Query.create(**query_def)
    new_query_dict = new_query.to_dict()
    print "-> query '{}' ID {}".format(new_query_dict["name"], new_query_dict["id"])

    # create the new visualizations
    for visualization in visualizations:
        if visualization.type == 'TABLE':
            continue
        
        old_id = visualization.id
        old_vis = models.Visualization.get_by_id_and_org(old_id, org)
        new_vis_params = {
            "type": old_vis.type,
            "query": new_query_dict["id"],
            "name": old_vis.name,
            "description": old_vis.description,
            "options": old_vis.options
        }

        new_visualization = models.Visualization.create(**new_vis_params)

        print "-> visualization '{}' ID {}".format(new_visualization.name, visualization.id)

