from __future__ import print_function
import simplejson
from redash import models

if __name__ == '__main__':
    for vis in models.Visualization.select():
        if vis.type == 'COUNTER':
            options = simplejson.loads(vis.options)
            print("Before: ", options)
            if 'rowNumber' in options and options['rowNumber'] is not None:
                options['rowNumber'] += 1
            else:
                options['rowNumber'] = 1

            if 'counterColName' not in options:
                options['counterColName'] = 'counter'

            if 'targetColName' not in options:
                options['targetColName'] = 'target'
            options['targetRowNumber'] = options['rowNumber']

            print("After: ", options)
            vis.options = simplejson.dumps(options)
            vis.save()
