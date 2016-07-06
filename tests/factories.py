import redash.models
from redash.utils import gen_query_hash, utcnow
from redash.utils.configuration import ConfigurationContainer


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
                            groups=[2],
                            org=1)

org_factory = ModelFactory(redash.models.Organization,
                           name=Sequence("Org {}"),
                           slug=Sequence("org{}.example.com"),
                           settings={})

data_source_factory = ModelFactory(redash.models.DataSource,
                                   name=Sequence('Test {}'),
                                   type='pg',
                                   # If we don't use lambda here it will reuse the same options between tests:
                                   options=lambda: ConfigurationContainer.from_json('{"dbname": "test"}'),
                                   org=1)

dashboard_factory = ModelFactory(redash.models.Dashboard,
                                 name='test', user=user_factory.create, layout='[]', org=1)

api_key_factory = ModelFactory(redash.models.ApiKey,
                               object=dashboard_factory.create)

query_factory = ModelFactory(redash.models.Query,
                             name='New Query',
                             description='',
                             query='SELECT 1',
                             user=user_factory.create,
                             is_archived=False,
                             schedule=None,
                             data_source=data_source_factory.create,
                             org=1)

query_with_params_factory = ModelFactory(redash.models.Query,
                             name='New Query with Params',
                             description='',
                             query='SELECT {{param1}}',
                             user=user_factory.create,
                             is_archived=False,
                             schedule=None,
                             data_source=data_source_factory.create,
                             org=1)

alert_factory = ModelFactory(redash.models.Alert,
                             name=Sequence('Alert {}'),
                             query=query_factory.create,
                             user=user_factory.create,
                             options={})

query_result_factory = ModelFactory(redash.models.QueryResult,
                                    data='{"columns":{}, "rows":[]}',
                                    runtime=1,
                                    retrieved_at=utcnow,
                                    query="SELECT 1",
                                    query_hash=gen_query_hash('SELECT 1'),
                                    data_source=data_source_factory.create,
                                    org=1)

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

destination_factory = ModelFactory(redash.models.NotificationDestination,
                                   org=1,
                                   user=user_factory.create,
                                   name='Destination',
                                   type='slack',
                                   options=ConfigurationContainer.from_json('{"url": "https://www.slack.com"}'))

alert_subscription_factory = ModelFactory(redash.models.AlertSubscription,
                                   user=user_factory.create,
                                   destination=destination_factory.create,
                                   alert=alert_factory.create)


class Factory(object):
    def __init__(self):
        self.org, self.admin_group, self.default_group = redash.models.init_db()
        self.org.domain = "org0.example.org"
        self.org.save()

        self.data_source = data_source_factory.create(org=self.org)
        self.user = self.create_user()
        redash.models.DataSourceGroup.create(group=self.default_group, data_source=self.data_source)

    def create_org(self, **kwargs):
        org = org_factory.create(**kwargs)

        self.create_group(org=org, type=redash.models.Group.BUILTIN_GROUP, name="default")
        self.create_group(org=org, type=redash.models.Group.BUILTIN_GROUP, name="admin", permissions=["admin"])

        return org

    def create_user(self, **kwargs):
        args = {
            'org': self.org,
            'groups': [self.default_group.id]
        }

        if 'org' in kwargs:
            args['groups'] = [kwargs['org'].default_group.id]

        args.update(kwargs)
        return user_factory.create(**args)

    def create_admin(self, **kwargs):
        args = {
            'org': self.org,
            'groups': [self.admin_group.id, self.default_group.id]
        }

        if 'org' in kwargs:
            args['groups'] = [kwargs['org'].default_group.id, kwargs['org'].admin_group.id]

        args.update(kwargs)
        return user_factory.create(**args)

    def create_group(self, **kwargs):
        args = {
            'name': 'Group',
            'org': self.org
        }

        args.update(kwargs)

        return redash.models.Group.create(**args)

    def create_alert(self, **kwargs):
        args = {
            'user': self.user,
            'query': self.create_query()
        }

        args.update(**kwargs)
        return alert_factory.create(**args)

    def create_alert_subscription(self, **kwargs):
        args = {
            'user': self.user,
            'alert': self.create_alert()
        }

        args.update(**kwargs)
        return alert_subscription_factory.create(**args)

    def create_data_source(self, **kwargs):
        args = {
            'org': self.org
        }
        args.update(kwargs)

        if 'group' in kwargs and 'org' not in kwargs:
            args['org'] = kwargs['group'].org

        data_source = data_source_factory.create(**args)

        if 'group' in kwargs:
            view_only = kwargs.pop('view_only', False)

            redash.models.DataSourceGroup.create(group=kwargs['group'],
                                                 data_source=data_source,
                                                 view_only=view_only)

        return data_source

    def create_dashboard(self, **kwargs):
        args = {
            'user': self.user,
            'org': self.org
        }
        args.update(kwargs)
        return dashboard_factory.create(**args)

    def create_query(self, **kwargs):
        args = {
            'user': self.user,
            'data_source': self.data_source,
            'org': self.org
        }
        args.update(kwargs)
        return query_factory.create(**args)

    def create_query_with_params(self, **kwargs):
        args = {
            'user': self.user,
            'data_source': self.data_source,
            'org': self.org
        }
        args.update(kwargs)
        return query_with_params_factory.create(**args)

    def create_query_result(self, **kwargs):
        args = {
            'data_source': self.data_source,
        }

        args.update(kwargs)

        if 'data_source' in args and 'org' not in args:
            args['org'] = args['data_source'].org_id

        return query_result_factory.create(**args)

    def create_visualization(self, **kwargs):
        args = {
            'query': self.create_query()
        }
        args.update(kwargs)
        return visualization_factory.create(**args)

    def create_visualization_with_params(self, **kwargs):
        args = {
            'query': self.create_query_with_params()
        }
        args.update(kwargs)
        return visualization_factory.create(**args)

    def create_widget(self, **kwargs):
        args = {
            'dashboard': self.create_dashboard(),
            'visualization': self.create_visualization()
        }
        args.update(kwargs)
        return widget_factory.create(**args)

    def create_api_key(self, **kwargs):
        args = {
            'org': self.org
        }
        args.update(kwargs)
        return api_key_factory.create(**args)

    def create_destination(self, **kwargs):
        return destination_factory.create(**kwargs)
