import json
import settings
from data.models import *

# first run:

# CREATE TABLE "visualizations" (
#     "id" serial NOT NULL PRIMARY KEY,
#     "type" varchar(100) NOT NULL,
#     "query_id" integer NOT NULL REFERENCES "queries" ("id") DEFERRABLE INITIALLY DEFERRED,
#     "name" varchar(255) NOT NULL,
#     "description" varchar(4096),
#     "options" text NOT NULL
# )
# ;

# ALTER TABLE widgets ADD COLUMN "visualization_id" integer REFERENCES "visualizations" ("id") DEFERRABLE INITIALLY DEFERRED;

if __name__ == '__main__':
    default_options = {"series": {"type": "bar"}}

    # create 'table' visualization for all queries
    print 'creating TABLE visualizations ...'
    for query in Query.objects.all():
        vis = Visualization(query=query, name="Table",
                            description=query.description,
                            type="TABLE", options="{}")
        vis.save()


    # create 'cohort' visualization for all queries named with 'cohort'
    print 'creating COHORT visualizations ...'
    for query in Query.objects.filter(name__icontains="cohort"):
        vis = Visualization(query=query, name="Cohort",
                            description=query.description,
                            type="COHORT", options="{}")
        vis.save()


    # create visualization for every widget (unless it already exists)
    print 'migrating Widgets -> Visualizations ...'
    for widget in Widget.objects.all():
        print 'processing widget %d:' % widget.id,
        query = widget.query
        vis_type = widget.type.upper()

        vis = query.visualizations.filter(type=vis_type)
        if vis:
            print 'visualization exists'
            widget.visualization = vis[0]
            widget.save()

        else:
            vis_name = widget.type.title()

            options = json.loads(widget.options)
            vis_options = {"series": options} if options else default_options
            vis_options = json.dumps(vis_options)

            vis = Visualization(query=query, name=vis_name,
                                description=query.description,
                                type=vis_type, options=vis_options)

            print 'created visualization %s' % vis_type
            vis.save()
            widget.visualization = vis
            widget.save()