import datetime

import pytest

from redash.models import MetrDashboard
from redash_global.models import (
    ComposedDashboard,
    ComposedDashboardEntry,
    DeploymentRun,
)

LIST_URL = "/global-api/composed-dashboards"


@pytest.fixture
def composed_dashboard(factory):
    return factory.create_composed_dashboard(name="Dashboard A", url_identifier="dashboard-a")


@pytest.fixture
def detail_url(composed_dashboard):
    return f"{LIST_URL}/{composed_dashboard.id}"


@pytest.fixture
def entries_url(composed_dashboard):
    return f"{LIST_URL}/{composed_dashboard.id}/entries"


def test_list_requires_authentication(client):
    response = client.get(LIST_URL)

    assert response.status_code == 302
    assert "/login" in response.headers["Location"]


def test_list_returns_all_composed_dashboards(admin_client, factory):
    factory.create_composed_dashboard(name="First", url_identifier="first")
    factory.create_composed_dashboard(name="Second", url_identifier="second")

    data = admin_client.get(LIST_URL).get_json()

    assert data["count"] == 2
    assert len(data["results"]) == 2
    names = [d["name"] for d in data["results"]]
    assert "First" in names
    assert "Second" in names


def test_list_orders_newest_first(admin_client, factory):
    factory.create_composed_dashboard(name="Older", url_identifier="older", created_at=datetime.datetime(2020, 1, 1))
    factory.create_composed_dashboard(name="Newer", url_identifier="newer", created_at=datetime.datetime(2021, 1, 1))

    data = admin_client.get(LIST_URL).get_json()

    assert [d["name"] for d in data["results"]] == ["Newer", "Older"]


def test_list_paginates(admin_client, factory):
    for i in range(3):
        factory.create_composed_dashboard(name=f"Dashboard {i}", url_identifier=f"dashboard-{i}")

    data = admin_client.get(f"{LIST_URL}?page=1&page_size=2").get_json()

    assert data["count"] == 3
    assert len(data["results"]) == 2
    assert data["page"] == 1
    assert data["page_size"] == 2


def test_list_handles_invalid_page_parameter(admin_client, factory):
    factory.create_composed_dashboard(name="Dashboard 1", url_identifier="dashboard-1")

    data = admin_client.get(f"{LIST_URL}?page=invalid").get_json()

    assert data["count"] == 1
    assert data["page"] == 1
    assert len(data["results"]) == 1


def test_list_handles_invalid_page_size_parameter(admin_client, factory):
    factory.create_composed_dashboard(name="Dashboard 1", url_identifier="dashboard-1")

    data = admin_client.get(f"{LIST_URL}?page_size=not-a-number").get_json()

    assert data["count"] == 1
    assert data["page_size"] == 25
    assert len(data["results"]) == 1


def test_list_handles_negative_page(admin_client, factory):
    factory.create_composed_dashboard(name="Dashboard 1", url_identifier="dashboard-1")

    data = admin_client.get(f"{LIST_URL}?page=-1").get_json()

    assert data["page"] == 1


def test_list_handles_zero_page_size(admin_client, factory):
    factory.create_composed_dashboard(name="Dashboard 1", url_identifier="dashboard-1")

    data = admin_client.get(f"{LIST_URL}?page_size=0").get_json()

    assert data["page_size"] == 1


def test_list_caps_page_size(admin_client, factory):
    factory.create_composed_dashboard(name="Only", url_identifier="only")

    data = admin_client.get(f"{LIST_URL}?page_size=100000").get_json()

    assert data["page_size"] == 100


def test_list_returns_expected_fields(admin_client, factory):
    dashboard = factory.create_composed_dashboard(name="Test Dashboard", url_identifier="test-dashboard")

    data = admin_client.get(LIST_URL).get_json()
    result = data["results"][0]

    assert result["id"] == dashboard.id
    assert result["name"] == "Test Dashboard"
    assert result["url_identifier"] == "test-dashboard"
    assert "created_at" in result
    assert "updated_at" in result


def test_detail_requires_authentication(client, composed_dashboard):
    response = client.get(f"{LIST_URL}/{composed_dashboard.id}")

    assert response.status_code == 302
    assert "/login" in response.headers["Location"]


def test_detail_returns_composed_dashboard(admin_client, composed_dashboard):
    response = admin_client.get(f"{LIST_URL}/{composed_dashboard.id}")

    assert response.status_code == 200
    data = response.get_json()
    assert data["id"] == composed_dashboard.id
    assert data["name"] == "Dashboard A"
    assert data["url_identifier"] == "dashboard-a"


def test_detail_returns_404_for_missing_dashboard(admin_client):
    response = admin_client.get(f"{LIST_URL}/999999")

    assert response.status_code == 404


def test_create_requires_authentication(client):
    response = client.post(LIST_URL, json={"name": "Test", "url_identifier": "test"})

    assert response.status_code == 302
    assert "/login" in response.headers["Location"]


def test_create_creates_and_returns_composed_dashboard(admin_client):
    response = admin_client.post(LIST_URL, json={"name": "New Dashboard", "url_identifier": "new-dashboard"})

    assert response.status_code == 201
    data = response.get_json()
    assert data["name"] == "New Dashboard"
    assert data["url_identifier"] == "new-dashboard"
    assert "id" in data
    assert "created_at" in data

    dashboard = ComposedDashboard.query.get(data["id"])
    assert dashboard is not None
    assert dashboard.name == "New Dashboard"
    assert dashboard.url_identifier == "new-dashboard"


def test_create_with_duplicate_url_identifier_fails(admin_client, composed_dashboard):
    response = admin_client.post(
        LIST_URL,
        json={"name": "Another Dashboard", "url_identifier": composed_dashboard.url_identifier},
    )

    assert response.status_code >= 400


def test_delete_requires_authentication(client, composed_dashboard):
    response = client.delete(f"{LIST_URL}/{composed_dashboard.id}")

    assert response.status_code == 302
    assert "/login" in response.headers["Location"]


def test_delete_removes_composed_dashboard(admin_client, composed_dashboard):
    dashboard_id = composed_dashboard.id

    response = admin_client.delete(f"{LIST_URL}/{dashboard_id}")

    assert response.status_code == 204
    assert ComposedDashboard.query.get(dashboard_id) is None


def test_delete_returns_404_for_missing_dashboard(admin_client):
    response = admin_client.delete(f"{LIST_URL}/999999")

    assert response.status_code == 404


def test_entries_list_requires_authentication(client, entries_url):
    response = client.get(entries_url)

    assert response.status_code == 302
    assert "/login" in response.headers["Location"]


def test_entries_list_returns_entries_ordered(admin_client, factory, composed_dashboard, entries_url):
    sub1 = factory.create_dashboard(name="Sub1")
    sub2 = factory.create_dashboard(name="Sub2")

    factory.create_composed_dashboard_entry(
        composed_dashboard_id=composed_dashboard.id, template_dashboard_id=sub2.id, order_index=1
    )
    factory.create_composed_dashboard_entry(
        composed_dashboard_id=composed_dashboard.id, template_dashboard_id=sub1.id, order_index=0
    )

    response = admin_client.get(entries_url)

    assert response.status_code == 200
    data = response.get_json()
    assert len(data) == 2
    assert data[0]["template_dashboard_id"] == sub1.id
    assert data[0]["order_index"] == 0
    assert data[1]["template_dashboard_id"] == sub2.id
    assert data[1]["order_index"] == 1


def test_entries_list_returns_404_for_missing_dashboard(admin_client):
    response = admin_client.get(f"{LIST_URL}/999999/entries")

    assert response.status_code == 404


def test_entry_create_requires_authentication(client, entries_url):
    response = client.post(entries_url, json={"template_dashboard_id": 1})

    assert response.status_code == 302
    assert "/login" in response.headers["Location"]


def test_entry_create_adds_entry(admin_client, factory, composed_dashboard, entries_url):
    sub = factory.create_dashboard(name="Subdashboard")

    response = admin_client.post(entries_url, json={"template_dashboard_id": sub.id})

    assert response.status_code == 201
    data = response.get_json()
    assert data["template_dashboard_id"] == sub.id
    assert data["order_index"] == 0
    assert data["composed_dashboard_id"] == composed_dashboard.id

    entry = ComposedDashboardEntry.query.get(data["id"])
    assert entry is not None


def test_entry_create_auto_increments_order_index(admin_client, factory, composed_dashboard, entries_url):
    sub1 = factory.create_dashboard(name="Sub1")
    sub2 = factory.create_dashboard(name="Sub2")

    admin_client.post(entries_url, json={"template_dashboard_id": sub1.id})
    response = admin_client.post(entries_url, json={"template_dashboard_id": sub2.id})

    data = response.get_json()
    assert data["order_index"] == 1


def test_entry_create_returns_404_for_missing_dashboard(admin_client):
    response = admin_client.post(f"{LIST_URL}/999999/entries", json={"template_dashboard_id": 1})

    assert response.status_code == 404


def test_entry_delete_requires_authentication(client, factory, composed_dashboard):
    entry = factory.create_composed_dashboard_entry(
        composed_dashboard_id=composed_dashboard.id, template_dashboard_id=factory.create_dashboard().id
    )
    response = client.delete(f"{LIST_URL}/{composed_dashboard.id}/entries/{entry.id}")

    assert response.status_code == 302
    assert "/login" in response.headers["Location"]


def test_entry_delete_removes_entry(admin_client, factory, composed_dashboard):
    sub = factory.create_dashboard(name="Subdashboard")
    entry = factory.create_composed_dashboard_entry(
        composed_dashboard_id=composed_dashboard.id, template_dashboard_id=sub.id
    )

    response = admin_client.delete(f"{LIST_URL}/{composed_dashboard.id}/entries/{entry.id}")

    assert response.status_code == 204
    assert ComposedDashboardEntry.query.get(entry.id) is None


def test_entry_delete_returns_404_for_missing_entry(admin_client, composed_dashboard):
    response = admin_client.delete(f"{LIST_URL}/{composed_dashboard.id}/entries/999999")

    assert response.status_code == 404


def test_entry_delete_returns_404_for_wrong_composed_dashboard(admin_client, factory, composed_dashboard):
    other_dashboard = factory.create_composed_dashboard(name="Other", url_identifier="other")
    sub = factory.create_dashboard(name="Subdashboard")
    entry = factory.create_composed_dashboard_entry(
        composed_dashboard_id=other_dashboard.id, template_dashboard_id=sub.id
    )

    response = admin_client.delete(f"{LIST_URL}/{composed_dashboard.id}/entries/{entry.id}")

    assert response.status_code == 404


def test_entries_reorder_requires_authentication(client, entries_url):
    response = client.post(f"{entries_url}/reorder", json={"entry_ids": []})

    assert response.status_code == 302
    assert "/login" in response.headers["Location"]


def test_entries_reorder_updates_order_indices(admin_client, factory, composed_dashboard, entries_url):
    sub1 = factory.create_dashboard(name="Sub1")
    sub2 = factory.create_dashboard(name="Sub2")
    sub3 = factory.create_dashboard(name="Sub3")

    entry1 = factory.create_composed_dashboard_entry(
        composed_dashboard_id=composed_dashboard.id, template_dashboard_id=sub1.id, order_index=0
    )
    entry2 = factory.create_composed_dashboard_entry(
        composed_dashboard_id=composed_dashboard.id, template_dashboard_id=sub2.id, order_index=1
    )
    entry3 = factory.create_composed_dashboard_entry(
        composed_dashboard_id=composed_dashboard.id, template_dashboard_id=sub3.id, order_index=2
    )

    response = admin_client.post(f"{entries_url}/reorder", json={"entry_ids": [entry3.id, entry1.id, entry2.id]})

    assert response.status_code == 200
    data = response.get_json()

    assert data[0]["id"] == entry3.id
    assert data[0]["order_index"] == 0
    assert data[1]["id"] == entry1.id
    assert data[1]["order_index"] == 1
    assert data[2]["id"] == entry2.id
    assert data[2]["order_index"] == 2


def test_entries_reorder_returns_404_for_missing_dashboard(admin_client):
    response = admin_client.post(f"{LIST_URL}/999999/entries/reorder", json={"entry_ids": []})

    assert response.status_code == 404


def test_entries_reorder_returns_404_for_wrong_entry(admin_client, factory, composed_dashboard):
    other_dashboard = factory.create_composed_dashboard(name="Other", url_identifier="other")
    sub = factory.create_dashboard(name="Subdashboard")
    entry = factory.create_composed_dashboard_entry(
        composed_dashboard_id=other_dashboard.id, template_dashboard_id=sub.id
    )

    response = admin_client.post(f"{LIST_URL}/{composed_dashboard.id}/entries/reorder", json={"entry_ids": [entry.id]})

    assert response.status_code == 404


@pytest.fixture
def deploy_url(composed_dashboard):
    return f"{LIST_URL}/{composed_dashboard.id}/deploy"


@pytest.fixture
def target_org(factory):
    return factory.create_org(name="Acme", slug="acme")


@pytest.fixture
def deployable_sub_dashboard(factory, composed_dashboard, target_org):
    """A sub-dashboard entry of ``composed_dashboard``, assigned to ``target_org``, that deploys cleanly."""
    sub_dashboard = factory.create_dashboard()
    widget = factory.create_widget(
        dashboard=sub_dashboard, options={"position": {"row": 0, "col": 0, "sizeX": 1, "sizeY": 1}}
    )
    factory.create_metr_data_source_for(widget.visualization.query_rel.data_source, "postgres")
    factory.create_composed_dashboard_entry(
        composed_dashboard_id=composed_dashboard.id, template_dashboard_id=sub_dashboard.id
    )

    factory.create_metr_data_source_for(factory.create_data_source(org=target_org), "postgres")
    factory.create_sub_dashboard_assignment(dashboard_id=sub_dashboard.id, organization_id=target_org.id)
    factory.create_deploy_user(target_org)
    return sub_dashboard


def test_deploy_requires_authentication(client, deploy_url):
    response = client.post(deploy_url)

    assert response.status_code == 302
    assert "/login" in response.headers["Location"]


def test_deploy_returns_404_for_missing_dashboard(admin_client):
    response = admin_client.post(f"{LIST_URL}/99999/deploy")

    assert response.status_code == 404


def test_deploy_without_any_assigned_org_returns_bad_request(admin_client, deploy_url):
    response = admin_client.post(deploy_url)

    assert response.status_code == 400
    assert "assigned" in response.get_json()["message"]


@pytest.mark.usefixtures("deployable_sub_dashboard")
def test_deploy_returns_the_run_with_a_result_per_target_org(admin_client, deploy_url, composed_dashboard):
    response = admin_client.post(deploy_url)

    assert response.status_code == 200
    data = response.get_json()
    assert data["composed_dashboard_id"] == composed_dashboard.id
    assert data["succeeded"] is True
    assert len(data["results"]) == 1
    assert data["results"][0]["organization_name"] == "Acme"
    assert data["results"][0]["organization_slug"] == "acme"
    assert data["results"][0]["errors"] == []


@pytest.mark.usefixtures("deployable_sub_dashboard")
def test_deploy_records_the_run_and_the_admin_who_ran_it(admin_client, deploy_url, admin, composed_dashboard):
    admin_client.post(deploy_url)

    run = DeploymentRun.query.filter_by(composed_dashboard_id=composed_dashboard.id).one()
    assert run.succeeded is True
    assert run.global_admin_user_id == admin.id


def test_deploy_reports_per_org_errors_when_an_org_fails(
    admin_client, factory, deploy_url, target_org, deployable_sub_dashboard
):
    # No data source carrying the "postgres" identifier, so this org fails validation and,
    # because a run is all or nothing, takes the healthy org down with it.
    failing_org = factory.create_org(name="Broken", slug="broken")
    factory.create_sub_dashboard_assignment(dashboard_id=deployable_sub_dashboard.id, organization_id=failing_org.id)
    factory.create_deploy_user(failing_org)

    response = admin_client.post(deploy_url)

    assert response.status_code == 200
    data = response.get_json()
    assert data["succeeded"] is False
    errors_by_slug = {result["organization_slug"]: result["errors"] for result in data["results"]}
    assert errors_by_slug["acme"] == []
    assert errors_by_slug["broken"]
    assert MetrDashboard.query.filter_by(url_identifier="dashboard-a").count() == 0


@pytest.mark.usefixtures("deployable_sub_dashboard")
def test_deploy_records_the_comment(admin_client, deploy_url, composed_dashboard):
    response = admin_client.post(deploy_url, json={"comment": "Rolling out the new funnel widget"})

    assert response.get_json()["comment"] == "Rolling out the new funnel widget"
    run = DeploymentRun.query.filter_by(composed_dashboard_id=composed_dashboard.id).one()
    assert run.comment == "Rolling out the new funnel widget"


@pytest.mark.usefixtures("deployable_sub_dashboard")
@pytest.mark.parametrize("body", [None, {}, {"comment": ""}, {"comment": "   "}])
def test_deploy_without_a_comment_records_none(admin_client, deploy_url, composed_dashboard, body):
    response = admin_client.post(deploy_url, json=body)

    assert response.get_json()["comment"] is None
    run = DeploymentRun.query.filter_by(composed_dashboard_id=composed_dashboard.id).one()
    assert run.comment is None


@pytest.fixture
def deployment_runs_url(composed_dashboard):
    return f"{LIST_URL}/{composed_dashboard.id}/deployment-runs"


def test_deployment_runs_requires_authentication(client, deployment_runs_url):
    response = client.get(deployment_runs_url)

    assert response.status_code == 302
    assert "/login" in response.headers["Location"]


def test_deployment_runs_returns_404_for_missing_dashboard(admin_client):
    response = admin_client.get(f"{LIST_URL}/99999/deployment-runs")

    assert response.status_code == 404


def test_deployment_runs_is_empty_for_a_never_deployed_dashboard(admin_client, deployment_runs_url):
    data = admin_client.get(deployment_runs_url).get_json()

    assert data["count"] == 0
    assert data["results"] == []


def test_deployment_runs_orders_latest_first(admin_client, factory, admin, composed_dashboard, deployment_runs_url):
    factory.create_deployment_run(
        composed_dashboard_id=composed_dashboard.id,
        global_admin_user_id=admin.id,
        comment="Older",
        created_at=datetime.datetime(2020, 1, 1),
    )
    factory.create_deployment_run(
        composed_dashboard_id=composed_dashboard.id,
        global_admin_user_id=admin.id,
        comment="Newer",
        created_at=datetime.datetime(2021, 1, 1),
    )

    data = admin_client.get(deployment_runs_url).get_json()

    assert [run["comment"] for run in data["results"]] == ["Newer", "Older"]


def test_deployment_runs_reports_who_ran_it_and_the_per_org_outcome(
    admin_client, factory, admin, composed_dashboard, deployment_runs_url
):
    failing_org = factory.create_org(name="Broken", slug="broken")
    healthy_org = factory.create_org(name="Acme", slug="acme")
    run = factory.create_deployment_run(
        composed_dashboard_id=composed_dashboard.id,
        global_admin_user_id=admin.id,
        succeeded=False,
        comment="Rolling out the new funnel widget",
    )
    factory.create_deployment_run_result(
        deployment_run_id=run.id, organization_id=failing_org.id, errors=["No deploy user"]
    )
    factory.create_deployment_run_result(deployment_run_id=run.id, organization_id=healthy_org.id, errors=[])

    data = admin_client.get(deployment_runs_url).get_json()

    assert data["count"] == 1
    reported = data["results"][0]
    assert reported["id"] == run.id
    assert reported["succeeded"] is False
    assert reported["comment"] == "Rolling out the new funnel widget"
    assert reported["deployed_by"] == admin.username
    assert reported["created_at"]
    # Results come back by organization name, so "Acme" precedes "Broken".
    assert [result["organization_name"] for result in reported["results"]] == ["Acme", "Broken"]
    assert [result["organization_slug"] for result in reported["results"]] == ["acme", "broken"]
    assert [result["errors"] for result in reported["results"]] == [[], ["No deploy user"]]


def test_deployment_runs_excludes_other_composed_dashboards(
    admin_client, factory, admin, composed_dashboard, deployment_runs_url
):
    other_dashboard = factory.create_composed_dashboard(name="Other", url_identifier="other")
    factory.create_deployment_run(composed_dashboard_id=composed_dashboard.id, global_admin_user_id=admin.id)
    factory.create_deployment_run(composed_dashboard_id=other_dashboard.id, global_admin_user_id=admin.id)

    data = admin_client.get(deployment_runs_url).get_json()

    assert data["count"] == 1
    assert data["results"][0]["composed_dashboard_id"] == composed_dashboard.id


def test_deployment_runs_paginates(admin_client, factory, admin, composed_dashboard, deployment_runs_url):
    for i in range(3):
        factory.create_deployment_run(
            composed_dashboard_id=composed_dashboard.id,
            global_admin_user_id=admin.id,
            created_at=datetime.datetime(2020, 1, i + 1),
        )

    data = admin_client.get(f"{deployment_runs_url}?page=2&page_size=2").get_json()

    assert data["count"] == 3
    assert data["page"] == 2
    assert data["page_size"] == 2
    assert len(data["results"]) == 1


def test_deployment_runs_caps_page_size(admin_client, factory, admin, composed_dashboard, deployment_runs_url):
    factory.create_deployment_run(composed_dashboard_id=composed_dashboard.id, global_admin_user_id=admin.id)

    data = admin_client.get(f"{deployment_runs_url}?page_size=100000").get_json()

    assert data["page_size"] == 100


@pytest.mark.usefixtures("deployable_sub_dashboard")
def test_deployment_runs_lists_a_run_made_by_the_deploy_endpoint(admin_client, deploy_url, deployment_runs_url):
    admin_client.post(deploy_url, json={"comment": "First rollout"})

    data = admin_client.get(deployment_runs_url).get_json()

    assert data["count"] == 1
    assert data["results"][0]["succeeded"] is True
    assert data["results"][0]["comment"] == "First rollout"
    assert data["results"][0]["results"][0]["organization_slug"] == "acme"
