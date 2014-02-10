import json
from playhouse.migrate import Migrator
from redash import db
from redash import models

if __name__ == '__main__':
    default_options = {"series": {"type": "column"}}

    db.connect_db()

    if not models.Visualization.table_exists():
        print "Creating visualization table..."
        models.Visualization.create_table()

    with db.database.transaction():
        migrator = Migrator(db.database)
        print "Adding visualization_id to widgets:"
        field = models.Widget.visualization
        field.null = True
        migrator.add_column(models.Widget, models.Widget.visualization, 'visualization_id')

    print 'Creating TABLE visualizations for all queries...'
    for query in models.Query.select():
        vis = models.Visualization(query=query, name="Table",
                                   description=query.description or "",
                                   type="TABLE", options="{}")
        vis.save()

    print 'Creating COHORT visualizations for all queries named like %cohort%...'
    for query in models.Query.select().where(models.Query.name ** "%cohort%"):
        vis = models.Visualization(query=query, name="Cohort",
                                   description=query.description or "",
                                   type="COHORT", options="{}")
        vis.save()

    print 'Create visualization for all widgets (unless exists already):'
    for widget in models.Widget.select():
        print 'Processing widget id: %d:' % widget.id
        vis_type = widget.type.upper()
        if vis_type == 'GRID':
            vis_type = 'TABLE'

        query = models.Query.get_by_id(widget.query_id)
        vis = query.visualizations.where(models.Visualization.type == vis_type).first()
        if vis:
            print '... visualization type (%s) found.' % vis_type
            widget.visualization = vis
            widget.save()
        else:
            vis_name = vis_type.title()

            options = json.loads(widget.options)
            vis_options = {"series": options} if options else default_options
            vis_options = json.dumps(vis_options)

            vis = models.Visualization(query=query, name=vis_name,
                                       description=query.description or "",
                                       type=vis_type, options=vis_options)

            print '... Created visualization for type: %s' % vis_type
            vis.save()
            widget.visualization = vis
            widget.save()

    with db.database.transaction():
        migrator = Migrator(db.database)
        print "Setting visualization_id as not null..."
        migrator.set_nullable(models.Widget, models.Widget.visualization, False)

    db.close_db(None)