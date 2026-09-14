import pytest

from redash_global import settings
from redash_global.deployment.utils import deployment_target_orgs


@pytest.fixture
def composed_dashboard(factory):
    return factory.create_composed_dashboard()


@pytest.fixture
def sub_dashboard(factory, composed_dashboard):
    dashboard = factory.create_dashboard()
    factory.create_composed_dashboard_entry(
        composed_dashboard_id=composed_dashboard.id, template_dashboard_id=dashboard.id
    )
    return dashboard


@pytest.fixture
def other_sub_dashboard(factory, composed_dashboard):
    dashboard = factory.create_dashboard()
    factory.create_composed_dashboard_entry(
        composed_dashboard_id=composed_dashboard.id, template_dashboard_id=dashboard.id, order_index=1
    )
    return dashboard


class TestDeploymentTargetOrgs:
    def test_returns_orgs_assigned_one_of_the_entries(self, factory, composed_dashboard, sub_dashboard):
        target_org = factory.create_org(name="Acme")
        factory.create_sub_dashboard_assignment(dashboard_id=sub_dashboard.id, organization_id=target_org.id)

        assert deployment_target_orgs(composed_dashboard) == [target_org]

    def test_ignores_orgs_assigned_only_an_unrelated_sub_dashboard(self, factory, composed_dashboard, sub_dashboard):
        unrelated_dashboard = factory.create_dashboard()
        other_org = factory.create_org(name="Elsewhere")
        factory.create_sub_dashboard_assignment(dashboard_id=unrelated_dashboard.id, organization_id=other_org.id)

        assert deployment_target_orgs(composed_dashboard) == []

    def test_returns_empty_when_the_composed_dashboard_has_no_entries(self, factory, composed_dashboard):
        dashboard = factory.create_dashboard()
        org = factory.create_org(name="Acme")
        factory.create_sub_dashboard_assignment(dashboard_id=dashboard.id, organization_id=org.id)

        assert deployment_target_orgs(composed_dashboard) == []

    def test_returns_an_org_once_when_it_is_assigned_several_entries(
        self, factory, composed_dashboard, sub_dashboard, other_sub_dashboard
    ):
        target_org = factory.create_org(name="Acme")
        for dashboard in (sub_dashboard, other_sub_dashboard):
            factory.create_sub_dashboard_assignment(dashboard_id=dashboard.id, organization_id=target_org.id)

        assert deployment_target_orgs(composed_dashboard) == [target_org]

    def test_orders_orgs_by_name(self, factory, composed_dashboard, sub_dashboard):
        zulu_org = factory.create_org(name="Zulu")
        alpha_org = factory.create_org(name="Alpha")
        for org in (zulu_org, alpha_org):
            factory.create_sub_dashboard_assignment(dashboard_id=sub_dashboard.id, organization_id=org.id)

        assert deployment_target_orgs(composed_dashboard) == [alpha_org, zulu_org]

    def test_excludes_the_template_org(self, factory, composed_dashboard, sub_dashboard):
        # The template org is where the sub-dashboards live, so assigning one to itself must
        # never deploy a copy back into it.
        template_org = factory.create_org(name="Template", slug=settings.TEMPLATE_ORG_SLUG)
        factory.create_sub_dashboard_assignment(dashboard_id=sub_dashboard.id, organization_id=template_org.id)

        assert deployment_target_orgs(composed_dashboard) == []

    def test_excludes_configured_non_target_orgs(self, factory, monkeypatch, composed_dashboard, sub_dashboard):
        # A slug that isn't the "operations" default, so this proves the setting is what drives
        # the exclusion rather than a hardcoded list.
        monkeypatch.setattr(settings, "ORG_SLUGS_EXCLUDED_FROM_DEPLOYMENT", ["internal"])
        internal_org = factory.create_org(name="Internal", slug="internal")
        target_org = factory.create_org(name="Acme")
        for org in (internal_org, target_org):
            factory.create_sub_dashboard_assignment(dashboard_id=sub_dashboard.id, organization_id=org.id)

        assert deployment_target_orgs(composed_dashboard) == [target_org]
