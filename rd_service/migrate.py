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
    print 'migrating Widgets -> Visualizations ...'

    for query in Query.objects.filter(name__icontains="cohort"):
        vis = Visualization(query=query, name=query.name,
                            description=query.description,
                            type="COHORT", options="{}")
        vis.save()


    for widget in Widget.objects.all():
        print 'processing widget %d' % widget.id
        query = widget.query
        vis_type = widget.type.upper()

        vis = query.visualizations.filter(type=vis_type)
        if vis:
            print 'found'
            widget.visualization = vis[0]
            widget.save()

        else:
            options = json.loads(widget.options)
            vis_options = {"series": options} if options else {}
            vis_options = json.dumps(vis_options)

            vis = Visualization(query=query, name=query.name,
                                            description=query.description,
                                            type=vis_type, options=vis_options)
            vis.save()
            widget.visualization = vis
            widget.save()