import datetime
import redash.models


class ModelFactory(object):
    def __init__(self, model, **kwargs):
        self.model = model
        self.kwargs = kwargs

    def _get_kwargs(self, override_kwargs):
        kwargs = self.kwargs.copy()
        kwargs.update(override_kwargs)

        for key, arg in kwargs.items():
            if callable(arg):
                kwargs[key] = arg()

        return kwargs

    def instance(self, **override_kwargs):
        kwargs = self._get_kwargs(override_kwargs)

        return self.model(**kwargs)

    def create(self, **override_kwargs):
        kwargs = self._get_kwargs(override_kwargs)
        return self.model.create(**kwargs)

dashboard_factory = ModelFactory(redash.models.Dashboard,
                                 name='test', user='test@everything.me', layout='[]')

query_factory = ModelFactory(redash.models.Query,
                             name='New Query',
                             description='',
                             query='SELECT 1',
                             ttl=-1,
                             user='test@everything.me')

query_result_factory = ModelFactory(redash.models.QueryResult,
                                    data='{"columns":{}, "rows":[]}',
                                    runtime=1,
                                    retrieved_at=datetime.datetime.now(),
                                    query=query_factory.create,
                                    query_hash='')

visualization_factory = ModelFactory(redash.models.Visualization,
                                     type='CHART',
                                     query=query_factory.create,
                                     name='Chart',
                                     description='',
                                     options='{}')

widget_factory = ModelFactory(redash.models.Widget,
                              type='chart',
                              width=1,
                              options='{}',
                              dashboard=dashboard_factory.create,
                              visualization=visualization_factory.create)
