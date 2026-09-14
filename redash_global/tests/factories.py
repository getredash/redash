from redash.models import MetrDashboard, MetrDataSource, MetrQuery, metrWidget
from redash_global.models import (
    ComposedDashboard,
    ComposedDashboardDeployment,
    ComposedDashboardEntry,
    DeploymentRun,
    DeploymentRunResult,
    SubDashboardAssignment,
)
from tests.factories import Factory as RedashFactory
from tests.factories import ModelFactory, Sequence

sub_dashboard_assignment_factory = ModelFactory(SubDashboardAssignment)

composed_dashboard_factory = ModelFactory(
    ComposedDashboard,
    url_identifier=Sequence("composed-dashboard-{}"),
    name=Sequence("Composed Dashboard {}"),
)

composed_dashboard_entry_factory = ModelFactory(ComposedDashboardEntry, order_index=0)

composed_dashboard_deployment_factory = ModelFactory(ComposedDashboardDeployment)

deployment_run_factory = ModelFactory(DeploymentRun, succeeded=True)

deployment_run_result_factory = ModelFactory(DeploymentRunResult, errors=[])

metr_data_source_factory = ModelFactory(MetrDataSource)

metr_dashboard_factory = ModelFactory(MetrDashboard)

metr_query_factory = ModelFactory(MetrQuery)

metr_widget_factory = ModelFactory(metrWidget)


class Factory(RedashFactory):
    """The main suite's factory, extended with the Redash Global models.

    Subclassing keeps the Redash Global models out of ``tests/factories.py``, so
    the main suite stays unaware of this app.
    """

    def create_sub_dashboard_assignment(self, **kwargs):
        args = {"organization_id": self.org.id}
        args.update(kwargs)
        return sub_dashboard_assignment_factory.create(**args)

    def create_deploy_user(self, org):
        return self.create_admin(org=org, email=f"engineering+{org.slug}@metr.systems")

    def create_composed_dashboard(self, **kwargs):
        return composed_dashboard_factory.create(**kwargs)

    def create_composed_dashboard_entry(self, **kwargs):
        args = {"composed_dashboard_id": lambda: self.create_composed_dashboard().id}
        args.update(kwargs)
        return composed_dashboard_entry_factory.create(**args)

    def create_composed_dashboard_deployment(self, **kwargs):
        args = {
            "composed_dashboard_id": lambda: self.create_composed_dashboard().id,
            "organization_id": self.org.id,
        }
        args.update(kwargs)
        return composed_dashboard_deployment_factory.create(**args)

    def create_deployment_run(self, **kwargs):
        args = {"composed_dashboard_id": lambda: self.create_composed_dashboard().id}
        args.update(kwargs)
        return deployment_run_factory.create(**args)

    def create_deployment_run_result(self, **kwargs):
        args = {"organization_id": self.org.id}
        args.update(kwargs)
        return deployment_run_result_factory.create(**args)

    def create_metr_data_source(self, **kwargs):
        return metr_data_source_factory.create(**kwargs)

    def create_metr_data_source_for(self, data_source, identifier):
        return self.create_metr_data_source(
            data_source_id=data_source.id,
            org_id=data_source.org_id,
            data_source_identifier=identifier,
        )

    def create_metr_dashboard(self, **kwargs):
        return metr_dashboard_factory.create(**kwargs)

    def create_metr_query(self, **kwargs):
        return metr_query_factory.create(**kwargs)

    def create_metr_widget(self, **kwargs):
        return metr_widget_factory.create(**kwargs)
