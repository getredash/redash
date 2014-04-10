import datetime
import redash.models
from redash.utils import gen_query_hash


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


class Sequence(object):
    def __init__(self, string):
        self.sequence = 0
        self.string = string

    def __call__(self):
        self.sequence += 1

        return self.string.format(self.sequence)


user_factory = ModelFactory(redash.models.User,
                            name='John Doe', email=Sequence('test{}@example.com'),
                            is_admin=False)


data_source_factory = ModelFactory(redash.models.DataSource,
                                   name='Test',
                                   type='pg',
                                   options='')


dashboard_factory = ModelFactory(redash.models.Dashboard,
                                 name='test', user=user_factory.create, layout='[]')


query_factory = ModelFactory(redash.models.Query,
                             name='New Query',
                             description='',
                             query='SELECT 1',
                             ttl=-1,
                             user=user_factory.create,
                             data_source=data_source_factory.create)

query_result_factory = ModelFactory(redash.models.QueryResult,
                                    data='{"columns":{}, "rows":[]}',
                                    runtime=1,
                                    retrieved_at=datetime.datetime.utcnow,
                                    query="SELECT 1",
                                    query_hash=gen_query_hash('SELECT 1'),
                                    data_source=data_source_factory.create)

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