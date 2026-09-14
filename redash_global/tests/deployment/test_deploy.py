from unittest.mock import patch

import pytest

from redash.models import Dashboard, MetrDashboard, MetrQuery, Query, Visualization, db
from redash_global.deployment.deploy import (
    copy_allowed_widgets_query,
    copy_widget,
    create_dashboard,
    delete_orphaned_visualizations,
    deploy_composed_dashboard,
    deploy_to_target_org,
    execute_query_dependencies,
    get_or_copy_query,
    get_or_create_dashboard,
    get_target_data_sources,
    ordered_org_assigned_subdashboard,
    record_deployment,
    replace_widgets,
    resolve_query_dropdown_dependencies,
)
from redash_global.deployment.exceptions import DeploymentErrorGroup, DeployUserError
from redash_global.models import ComposedDashboardDeployment, DeploymentRun


@pytest.fixture
def sub_dashboard(factory):
    return factory.create_dashboard()


@pytest.fixture
def target_org(factory):
    return factory.create_org()


class TestGetTargetDataSources:
    def test_returns_empty_dict_when_no_widgets_have_queries(self, factory, sub_dashboard, target_org):
        factory.create_widget(dashboard=sub_dashboard, visualization=None, text="text only")

        result = get_target_data_sources([sub_dashboard], target_org)

        assert result == {}

    def test_returns_matching_data_sources_by_identifier(self, factory, sub_dashboard, target_org):
        widget = factory.create_widget(dashboard=sub_dashboard)
        template_ds = widget.visualization.query_rel.data_source
        factory.create_metr_data_source_for(template_ds, "postgres")

        target_ds = factory.create_data_source(org=target_org)
        factory.create_metr_data_source_for(target_ds, "postgres")

        result = get_target_data_sources([sub_dashboard], target_org)

        assert result == {"postgres": target_ds}

    def test_ignores_data_sources_without_identifiers(self, factory, sub_dashboard, target_org):
        factory.create_widget(dashboard=sub_dashboard)

        result = get_target_data_sources([sub_dashboard], target_org)

        assert result == {}

    def test_returns_only_matching_identifiers(self, factory, sub_dashboard, target_org):
        widget = factory.create_widget(dashboard=sub_dashboard)
        factory.create_metr_data_source_for(widget.visualization.query_rel.data_source, "postgres")

        target_ds = factory.create_data_source(org=target_org)
        factory.create_metr_data_source_for(target_ds, "mysql")

        result = get_target_data_sources([sub_dashboard], target_org)

        assert result == {}

    def test_includes_data_sources_from_parameter_queries(self, factory, sub_dashboard, target_org):
        template_org = sub_dashboard.org
        main_ds = factory.create_data_source(org=template_org)
        factory.create_metr_data_source_for(main_ds, "postgres")

        param_ds = factory.create_data_source(org=template_org)
        factory.create_metr_data_source_for(param_ds, "mysql")

        dep_dashboard = factory.create_dashboard(org=template_org)
        dep_widget = factory.create_widget(dashboard=dep_dashboard)
        dep_query = dep_widget.visualization.query_rel
        dep_query.data_source = param_ds

        widget = factory.create_widget(dashboard=sub_dashboard)
        query = widget.visualization.query_rel
        query.data_source = main_ds
        query.options = {
            "parameters": [
                {"name": "dropdown_param", "type": "query", "queryId": dep_query.id},
            ]
        }

        target_main_ds = factory.create_data_source(org=target_org)
        factory.create_metr_data_source_for(target_main_ds, "postgres")
        target_param_ds = factory.create_data_source(org=target_org)
        factory.create_metr_data_source_for(target_param_ds, "mysql")

        result = get_target_data_sources([sub_dashboard], target_org)

        assert result == {"postgres": target_main_ds, "mysql": target_param_ds}


class TestResolveQueryDropdownDependencies:
    def test_ignores_parameters_without_query_type(self, factory, target_org):
        deploy_user = factory.create_user(org=target_org)
        data_source_map = {}
        query_id_map = {}

        query_options = {
            "parameters": [
                {"name": "param1", "type": "text"},
                {"name": "param2", "type": "date"},
            ]
        }

        resolve_query_dropdown_dependencies(query_options, target_org, deploy_user, data_source_map, query_id_map)

        assert query_id_map == {}

    def test_updates_existing_query_id_in_map(self, factory, target_org):
        deploy_user = factory.create_user(org=target_org)
        data_source_map = {}
        query_id_map = {123: 456}

        query_options = {
            "parameters": [
                {"name": "param1", "type": "query", "queryId": 123},
            ]
        }

        resolve_query_dropdown_dependencies(query_options, target_org, deploy_user, data_source_map, query_id_map)

        assert query_options["parameters"][0]["queryId"] == 456

    def test_copies_missing_query_dependency(self, factory, target_org):
        template_org = factory.create_org()
        template_ds = factory.create_data_source(org=template_org)
        factory.create_metr_data_source_for(template_ds, "postgres")

        dep_dashboard = factory.create_dashboard(org=template_org)
        dep_widget = factory.create_widget(dashboard=dep_dashboard)
        dep_query = dep_widget.visualization.query_rel
        dep_query.data_source = template_ds

        target_ds = factory.create_data_source(org=target_org)
        factory.create_metr_data_source_for(target_ds, "postgres")
        data_source_map = {"postgres": target_ds}

        deploy_user = factory.create_user(org=target_org)
        query_id_map = {}

        query_options = {
            "parameters": [
                {"name": "param1", "type": "query", "queryId": dep_query.id},
            ]
        }

        resolve_query_dropdown_dependencies(query_options, target_org, deploy_user, data_source_map, query_id_map)

        assert query_options["parameters"][0]["queryId"] != dep_query.id
        copied_query_id = query_options["parameters"][0]["queryId"]
        copied_query = (
            db.session.query(MetrQuery).filter_by(template_query_id=dep_query.id, org_id=target_org.id).one()
        )
        assert copied_query.query_id == copied_query_id


class TestGetOrCopyQuery:
    def test_creates_new_query_when_none_exists(self, factory, sub_dashboard, target_org):
        widget = factory.create_widget(dashboard=sub_dashboard)
        template_query = widget.visualization.query_rel
        factory.create_metr_data_source_for(template_query.data_source, "postgres")
        target_ds = factory.create_data_source(org=target_org)
        factory.create_metr_data_source_for(target_ds, "postgres")
        data_source_map = {"postgres": target_ds}

        deploy_user = factory.create_user(org=target_org)

        result = get_or_copy_query(template_query, target_org, deploy_user, data_source_map)

        assert result.org_id == target_org.id
        assert result.data_source_id == target_ds.id
        assert result.name == template_query.name
        assert result.query_text == template_query.query_text

    def test_creates_metr_query_tracking_template_query(self, factory, sub_dashboard, target_org):
        widget = factory.create_widget(dashboard=sub_dashboard)
        template_query = widget.visualization.query_rel
        factory.create_metr_data_source_for(template_query.data_source, "postgres")
        target_ds = factory.create_data_source(org=target_org)
        factory.create_metr_data_source_for(target_ds, "postgres")
        data_source_map = {"postgres": target_ds}

        deploy_user = factory.create_user(org=target_org)

        result = get_or_copy_query(template_query, target_org, deploy_user, data_source_map)

        metr_query = db.session.query(MetrQuery).filter_by(query_id=result.id).one()
        assert metr_query.template_query_id == template_query.id
        assert metr_query.org_id == target_org.id

    def test_updates_existing_query_in_place(self, factory, sub_dashboard, target_org):
        widget = factory.create_widget(dashboard=sub_dashboard)
        template_query = widget.visualization.query_rel
        factory.create_metr_data_source_for(template_query.data_source, "postgres")
        target_ds = factory.create_data_source(org=target_org)
        factory.create_metr_data_source_for(target_ds, "postgres")
        data_source_map = {"postgres": target_ds}

        deploy_user = factory.create_user(org=target_org)

        first_result = get_or_copy_query(template_query, target_org, deploy_user, data_source_map)
        first_id = first_result.id

        template_query.query_text = "SELECT 2"

        second_result = get_or_copy_query(template_query, target_org, deploy_user, data_source_map)

        assert second_result.id == first_id
        assert second_result.query_text == "SELECT 2"

    def test_copies_schedule_from_template(self, factory, sub_dashboard, target_org):
        schedule = {"interval": 3600, "time": None, "day_of_week": None, "until": None}
        widget = factory.create_widget(dashboard=sub_dashboard)
        template_query = widget.visualization.query_rel
        template_query.schedule = schedule
        factory.create_metr_data_source_for(template_query.data_source, "postgres")
        target_ds = factory.create_data_source(org=target_org)
        factory.create_metr_data_source_for(target_ds, "postgres")
        data_source_map = {"postgres": target_ds}

        deploy_user = factory.create_user(org=target_org)

        result = get_or_copy_query(template_query, target_org, deploy_user, data_source_map)

        assert result.schedule == schedule
        # A copy, not the template's own dict: editing one must not change the other.
        assert result.schedule is not template_query.schedule

    def test_updates_schedule_on_redeploy(self, factory, sub_dashboard, target_org):
        widget = factory.create_widget(dashboard=sub_dashboard)
        template_query = widget.visualization.query_rel
        template_query.schedule = {"interval": 3600, "time": None, "day_of_week": None, "until": None}
        factory.create_metr_data_source_for(template_query.data_source, "postgres")
        target_ds = factory.create_data_source(org=target_org)
        factory.create_metr_data_source_for(target_ds, "postgres")
        data_source_map = {"postgres": target_ds}

        deploy_user = factory.create_user(org=target_org)

        get_or_copy_query(template_query, target_org, deploy_user, data_source_map)

        template_query.schedule = {"interval": 86400, "time": "09:00", "day_of_week": None, "until": None}
        result = get_or_copy_query(template_query, target_org, deploy_user, data_source_map)

        assert result.schedule == {"interval": 86400, "time": "09:00", "day_of_week": None, "until": None}

    def test_copies_query_with_query_based_parameter(self, factory, sub_dashboard, target_org):
        template_org = sub_dashboard.org
        template_ds = factory.create_data_source(org=template_org)
        factory.create_metr_data_source_for(template_ds, "postgres")

        dep_dashboard = factory.create_dashboard(org=template_org)
        dep_widget = factory.create_widget(dashboard=dep_dashboard)
        dep_query = dep_widget.visualization.query_rel
        dep_query.data_source = template_ds

        widget = factory.create_widget(dashboard=sub_dashboard)
        template_query = widget.visualization.query_rel
        template_query.data_source = template_ds
        template_query.options = {
            "parameters": [
                {"name": "dropdown_param", "type": "query", "queryId": dep_query.id},
            ]
        }

        target_ds = factory.create_data_source(org=target_org)
        factory.create_metr_data_source_for(target_ds, "postgres")
        data_source_map = {"postgres": target_ds}

        deploy_user = factory.create_user(org=target_org)

        result = get_or_copy_query(template_query, target_org, deploy_user, data_source_map)

        assert result.options["parameters"][0]["queryId"] != dep_query.id
        assert result.options["parameters"][0]["type"] == "query"

    def test_reuses_copied_query_for_shared_parameter_dependency(self, factory, target_org):
        template_org = factory.create_org()
        template_ds = factory.create_data_source(org=template_org)
        factory.create_metr_data_source_for(template_ds, "postgres")

        dep_dashboard = factory.create_dashboard(org=template_org)
        dep_widget = factory.create_widget(dashboard=dep_dashboard)
        dep_query = dep_widget.visualization.query_rel
        dep_query.data_source = template_ds

        target_ds = factory.create_data_source(org=target_org)
        factory.create_metr_data_source_for(target_ds, "postgres")
        data_source_map = {"postgres": target_ds}

        deploy_user = factory.create_user(org=target_org)
        query_id_map = {}

        query1_dashboard = factory.create_dashboard(org=template_org)
        query1_widget = factory.create_widget(dashboard=query1_dashboard)
        query1 = query1_widget.visualization.query_rel
        query1.data_source = template_ds
        query1.options = {
            "parameters": [
                {"name": "dropdown_param", "type": "query", "queryId": dep_query.id},
            ]
        }

        query2_dashboard = factory.create_dashboard(org=template_org)
        query2_widget = factory.create_widget(dashboard=query2_dashboard)
        query2 = query2_widget.visualization.query_rel
        query2.data_source = template_ds
        query2.options = {
            "parameters": [
                {"name": "dropdown_param", "type": "query", "queryId": dep_query.id},
            ]
        }

        result1 = get_or_copy_query(query1, target_org, deploy_user, data_source_map, query_id_map)
        result2 = get_or_copy_query(query2, target_org, deploy_user, data_source_map, query_id_map)

        assert result1.options["parameters"][0]["queryId"] == result2.options["parameters"][0]["queryId"]

    def test_handles_none_options_with_query_based_parameter(self, factory, target_org):
        template_org = factory.create_org()
        template_ds = factory.create_data_source(org=template_org)
        factory.create_metr_data_source_for(template_ds, "postgres")

        dep_dashboard = factory.create_dashboard(org=template_org)
        dep_widget = factory.create_widget(dashboard=dep_dashboard)
        dep_query = dep_widget.visualization.query_rel
        dep_query.data_source = template_ds

        widget = factory.create_widget(dashboard=factory.create_dashboard(org=template_org))
        template_query = widget.visualization.query_rel
        template_query.data_source = template_ds
        template_query.options = None

        target_ds = factory.create_data_source(org=target_org)
        factory.create_metr_data_source_for(target_ds, "postgres")
        data_source_map = {"postgres": target_ds}

        deploy_user = factory.create_user(org=target_org)

        result = get_or_copy_query(template_query, target_org, deploy_user, data_source_map)

        assert result.options is not None
        assert isinstance(result.options, dict)

    def test_clears_value_of_fixed_from_url_parameters(self, factory, sub_dashboard, target_org):
        widget = factory.create_widget(dashboard=sub_dashboard)
        template_query = widget.visualization.query_rel
        factory.create_metr_data_source_for(template_query.data_source, "postgres")
        template_query.options = {
            "parameters": [
                {"name": "address", "type": "text", "value": "template-address"},
                {"name": "period", "type": "text", "value": "last-month"},
            ]
        }
        target_ds = factory.create_data_source(org=target_org)
        factory.create_metr_data_source_for(target_ds, "postgres")
        data_source_map = {"postgres": target_ds}

        deploy_user = factory.create_user(org=target_org)

        result = get_or_copy_query(
            template_query, target_org, deploy_user, data_source_map, fixed_param_names={"address"}
        )

        assert result.options["parameters"][0]["value"] is None
        assert result.options["parameters"][1]["value"] == "last-month"

    def test_clears_fixed_from_url_value_when_updating_existing_query(self, factory, sub_dashboard, target_org):
        widget = factory.create_widget(dashboard=sub_dashboard)
        template_query = widget.visualization.query_rel
        factory.create_metr_data_source_for(template_query.data_source, "postgres")
        template_query.options = {"parameters": [{"name": "address", "type": "text", "value": "template-address"}]}
        target_ds = factory.create_data_source(org=target_org)
        factory.create_metr_data_source_for(target_ds, "postgres")
        data_source_map = {"postgres": target_ds}

        deploy_user = factory.create_user(org=target_org)

        get_or_copy_query(template_query, target_org, deploy_user, data_source_map)
        result = get_or_copy_query(
            template_query, target_org, deploy_user, data_source_map, fixed_param_names={"address"}
        )

        assert result.options["parameters"][0]["value"] is None

    def test_preserves_parameter_value_when_updating_query_id(self, factory, target_org):
        template_org = factory.create_org()
        template_ds = factory.create_data_source(org=template_org)
        factory.create_metr_data_source_for(template_ds, "postgres")

        dep_dashboard = factory.create_dashboard(org=template_org)
        dep_widget = factory.create_widget(dashboard=dep_dashboard)
        dep_query = dep_widget.visualization.query_rel
        dep_query.data_source = template_ds

        widget = factory.create_widget(dashboard=factory.create_dashboard(org=template_org))
        template_query = widget.visualization.query_rel
        template_query.data_source = template_ds
        template_query.options = {
            "parameters": [
                {"name": "dropdown_param", "type": "query", "queryId": dep_query.id, "value": "some_value"},
            ]
        }

        target_ds = factory.create_data_source(org=target_org)
        factory.create_metr_data_source_for(target_ds, "postgres")
        data_source_map = {"postgres": target_ds}

        deploy_user = factory.create_user(org=target_org)

        result = get_or_copy_query(template_query, target_org, deploy_user, data_source_map)

        assert result.options["parameters"][0]["queryId"] != dep_query.id
        assert result.options["parameters"][0]["value"] == "some_value"


class TestCopyAllowedWidgetsQuery:
    def test_returns_none_when_no_allowed_widgets_query(self, factory, sub_dashboard, target_org):
        factory.create_widget(dashboard=sub_dashboard)
        deploy_user = factory.create_user(org=target_org)
        data_source_map = {}

        result = copy_allowed_widgets_query([sub_dashboard], target_org, deploy_user, data_source_map)

        assert result is None

    def test_returns_the_copied_query(self, factory, sub_dashboard, target_org):
        query = factory.create_query()
        factory.create_metr_query(query=query, org_id=query.org_id, query_identifier="allowed-widgets")
        factory.create_metr_dashboard(
            dashboard_id=sub_dashboard.id,
            org_id=sub_dashboard.org_id,
            allowed_widget_query_identifier="allowed-widgets",
        )
        factory.create_metr_data_source_for(query.data_source, "postgres")
        target_ds = factory.create_data_source(org=target_org)
        factory.create_metr_data_source_for(target_ds, "postgres")
        data_source_map = {"postgres": target_ds}

        deploy_user = factory.create_user(org=target_org)

        result = copy_allowed_widgets_query([sub_dashboard], target_org, deploy_user, data_source_map)

        assert result.org_id == target_org.id
        assert result.metr_query.query_identifier == "allowed-widgets"


class TestCopyWidget:
    def test_copies_widget_with_visualization(self, factory, sub_dashboard, target_org):
        widget = factory.create_widget(
            dashboard=sub_dashboard, options={"position": {"row": 0, "col": 0, "sizeX": 1, "sizeY": 1}}
        )
        query = widget.visualization.query_rel
        factory.create_metr_data_source_for(query.data_source, "postgres")
        target_ds = factory.create_data_source(org=target_org)
        factory.create_metr_data_source_for(target_ds, "postgres")
        data_source_map = {"postgres": target_ds}

        target_dashboard = factory.create_dashboard(org=target_org)
        deploy_user = factory.create_user(org=target_org)

        result = copy_widget(widget, target_dashboard, target_org, deploy_user, data_source_map, row_offset=0)

        assert result.dashboard_id == target_dashboard.id
        assert result.visualization_id is not None
        assert result.options["position"]["row"] == 0

    def test_offsets_widget_row_position(self, factory, sub_dashboard, target_org):
        widget = factory.create_widget(
            dashboard=sub_dashboard, options={"position": {"row": 5, "col": 0, "sizeX": 1, "sizeY": 1}}
        )
        query = widget.visualization.query_rel
        factory.create_metr_data_source_for(query.data_source, "postgres")
        target_ds = factory.create_data_source(org=target_org)
        factory.create_metr_data_source_for(target_ds, "postgres")
        data_source_map = {"postgres": target_ds}

        target_dashboard = factory.create_dashboard(org=target_org)
        deploy_user = factory.create_user(org=target_org)

        result = copy_widget(widget, target_dashboard, target_org, deploy_user, data_source_map, row_offset=10)

        assert result.options["position"]["row"] == 15

    def test_copies_text_only_widget(self, factory, sub_dashboard, target_org):
        widget = factory.create_widget(
            dashboard=sub_dashboard,
            visualization=None,
            text="hello",
            options={"position": {"row": 0, "col": 0, "sizeX": 1, "sizeY": 1}},
        )

        target_dashboard = factory.create_dashboard(org=target_org)
        deploy_user = factory.create_user(org=target_org)

        result = copy_widget(widget, target_dashboard, target_org, deploy_user, {}, row_offset=0)

        assert result.text == "hello"
        assert result.visualization_id is None

    def test_copies_widget_with_query_based_parameter(self, factory, sub_dashboard, target_org):
        template_org = sub_dashboard.org
        template_ds = factory.create_data_source(org=template_org)
        factory.create_metr_data_source_for(template_ds, "postgres")

        dep_dashboard = factory.create_dashboard(org=template_org)
        dep_widget = factory.create_widget(dashboard=dep_dashboard)
        dep_query = dep_widget.visualization.query_rel
        dep_query.data_source = template_ds

        widget = factory.create_widget(
            dashboard=sub_dashboard, options={"position": {"row": 0, "col": 0, "sizeX": 1, "sizeY": 1}}
        )
        query = widget.visualization.query_rel
        query.data_source = template_ds
        query.options = {
            "parameters": [
                {"name": "dropdown_param", "type": "query", "queryId": dep_query.id},
            ]
        }

        target_ds = factory.create_data_source(org=target_org)
        factory.create_metr_data_source_for(target_ds, "postgres")
        data_source_map = {"postgres": target_ds}

        target_dashboard = factory.create_dashboard(org=target_org)
        deploy_user = factory.create_user(org=target_org)

        result = copy_widget(widget, target_dashboard, target_org, deploy_user, data_source_map, row_offset=0)

        assert result.visualization.query_rel.options["parameters"][0]["queryId"] != dep_query.id

    def test_clears_fixed_from_url_parameter_value_on_copied_query(self, factory, sub_dashboard, target_org):
        widget = factory.create_widget(
            dashboard=sub_dashboard,
            options={
                "position": {"row": 0, "col": 0, "sizeX": 1, "sizeY": 1},
                "parameterMappings": {
                    "address": {"name": "address", "type": "fixed-from-url", "mapTo": "address", "value": None},
                    "period": {"name": "period", "type": "widget-level", "mapTo": "period", "value": None},
                },
            },
        )
        query = widget.visualization.query_rel
        factory.create_metr_data_source_for(query.data_source, "postgres")
        query.options = {
            "parameters": [
                {"name": "address", "type": "text", "value": "template-address"},
                {"name": "period", "type": "text", "value": "last-month"},
            ]
        }
        target_ds = factory.create_data_source(org=target_org)
        factory.create_metr_data_source_for(target_ds, "postgres")
        data_source_map = {"postgres": target_ds}

        target_dashboard = factory.create_dashboard(org=target_org)
        deploy_user = factory.create_user(org=target_org)

        result = copy_widget(widget, target_dashboard, target_org, deploy_user, data_source_map, row_offset=0)

        parameters = result.visualization.query_rel.options["parameters"]
        assert parameters[0]["value"] is None
        assert parameters[1]["value"] == "last-month"
        # the template itself keeps its value
        assert query.options["parameters"][0]["value"] == "template-address"


class TestDeleteOrphanedVisualizations:
    def test_deletes_visualization_with_no_widgets(self, factory):
        visualization = factory.create_visualization()

        delete_orphaned_visualizations([visualization.id])

        assert Visualization.query.get(visualization.id) is None

    def test_does_not_delete_visualization_with_widgets(self, factory, sub_dashboard):
        factory.create_widget(dashboard=sub_dashboard)
        visualization = sub_dashboard.widgets[0].visualization

        delete_orphaned_visualizations([visualization.id])

        assert Visualization.query.get(visualization.id) is not None

    def test_deletes_query_when_last_visualization_removed(self, factory):
        visualization = factory.create_visualization()
        query_id = visualization.query_rel.id

        delete_orphaned_visualizations([visualization.id])

        from redash.models import Query

        assert Query.query.get(query_id) is None


class TestReplaceWidgets:
    def test_removes_old_widgets_and_copies_new_ones(self, factory, sub_dashboard, target_org):
        template_widget = factory.create_widget(
            dashboard=sub_dashboard, options={"position": {"row": 0, "col": 0, "sizeX": 1, "sizeY": 1}}
        )
        query = template_widget.visualization.query_rel
        factory.create_metr_data_source_for(query.data_source, "postgres")
        target_ds = factory.create_data_source(org=target_org)
        factory.create_metr_data_source_for(target_ds, "postgres")
        data_source_map = {"postgres": target_ds}

        target_dashboard = factory.create_dashboard(org=target_org)
        old_widget = factory.create_widget(dashboard=target_dashboard)

        deploy_user = factory.create_user(org=target_org)

        replace_widgets(target_dashboard, [sub_dashboard], target_org, deploy_user, data_source_map)

        assert target_dashboard.widgets.count() == 1
        assert target_dashboard.widgets[0].id != old_widget.id

    def test_offsets_rows_across_multiple_sub_dashboards(self, factory, sub_dashboard, target_org):
        factory.create_widget(
            dashboard=sub_dashboard, options={"position": {"row": 0, "col": 0, "sizeX": 1, "sizeY": 2}}
        )
        other_sub_dashboard = factory.create_dashboard()
        factory.create_widget(
            dashboard=other_sub_dashboard, options={"position": {"row": 0, "col": 0, "sizeX": 1, "sizeY": 3}}
        )

        data_sources = set()
        for widget in list(sub_dashboard.widgets) + list(other_sub_dashboard.widgets):
            query = widget.visualization.query_rel
            if query.data_source_id not in data_sources:
                factory.create_metr_data_source_for(query.data_source, "postgres")
                data_sources.add(query.data_source_id)

        target_ds = factory.create_data_source(org=target_org)
        factory.create_metr_data_source_for(target_ds, "postgres")
        data_source_map = {"postgres": target_ds}

        target_dashboard = factory.create_dashboard(org=target_org)
        deploy_user = factory.create_user(org=target_org)

        replace_widgets(
            target_dashboard, [sub_dashboard, other_sub_dashboard], target_org, deploy_user, data_source_map
        )

        rows = sorted(w.options["position"]["row"] for w in target_dashboard.widgets.all())
        assert rows == [0, 2]


class TestCreateDashboard:
    def test_creates_dashboard_with_metr_dashboard(self, factory, target_org):
        composed_dashboard = factory.create_composed_dashboard()
        deploy_user = factory.create_user(org=target_org)

        dashboard = create_dashboard(composed_dashboard, target_org, deploy_user)

        assert dashboard.name == composed_dashboard.name
        assert dashboard.org_id == target_org.id
        assert dashboard.user_id == deploy_user.id
        assert dashboard.is_draft is True

    def test_adds_default_group_to_dashboard(self, factory, target_org):
        composed_dashboard = factory.create_composed_dashboard()
        deploy_user = factory.create_user(org=target_org)

        dashboard = create_dashboard(composed_dashboard, target_org, deploy_user)

        assert dashboard.dashboard_groups[0].group_id == target_org.default_group.id

    def test_creates_metr_dashboard_with_url_identifier(self, factory, target_org):
        composed_dashboard = factory.create_composed_dashboard()
        deploy_user = factory.create_user(org=target_org)

        dashboard = create_dashboard(composed_dashboard, target_org, deploy_user)

        metr_dashboard = MetrDashboard.query.filter_by(dashboard_id=dashboard.id).one()
        assert metr_dashboard.url_identifier == composed_dashboard.url_identifier
        assert metr_dashboard.org_id == target_org.id


class TestGetOrCreateDashboard:
    def test_creates_new_dashboard_when_none_exists(self, factory, target_org):
        composed_dashboard = factory.create_composed_dashboard()
        deploy_user = factory.create_user(org=target_org)

        dashboard = get_or_create_dashboard(composed_dashboard, target_org, deploy_user, None)

        assert Dashboard.query.filter_by(id=dashboard.id, org_id=target_org.id).one()

    def test_updates_name_when_dashboard_exists(self, factory, target_org):
        composed_dashboard = factory.create_composed_dashboard()
        deploy_user = factory.create_user(org=target_org)

        first_dashboard = create_dashboard(composed_dashboard, target_org, deploy_user)
        first_name = first_dashboard.name

        composed_dashboard.name = "Updated Name"

        second_dashboard = get_or_create_dashboard(composed_dashboard, target_org, deploy_user, None)

        assert second_dashboard.id == first_dashboard.id
        assert second_dashboard.name == "Updated Name"
        assert second_dashboard.name != first_name

    def test_keeps_published_state_when_dashboard_exists(self, factory, target_org):
        composed_dashboard = factory.create_composed_dashboard()
        deploy_user = factory.create_user(org=target_org)

        first_dashboard = create_dashboard(composed_dashboard, target_org, deploy_user)
        first_dashboard.is_draft = False

        second_dashboard = get_or_create_dashboard(composed_dashboard, target_org, deploy_user, None)

        assert second_dashboard.id == first_dashboard.id
        assert second_dashboard.is_draft is False

    def test_sets_allowed_widget_query_identifier(self, factory, target_org):
        composed_dashboard = factory.create_composed_dashboard()
        deploy_user = factory.create_user(org=target_org)

        dashboard = get_or_create_dashboard(composed_dashboard, target_org, deploy_user, "allowed-query")

        assert dashboard.metr_dashboard.allowed_widget_query_identifier == "allowed-query"


class TestRecordDeployment:
    def test_creates_new_deployment_record(self, factory, target_org):
        composed_dashboard = factory.create_composed_dashboard()

        record_deployment(composed_dashboard, target_org)

        deployment = ComposedDashboardDeployment.query.filter_by(
            composed_dashboard_id=composed_dashboard.id, organization_id=target_org.id
        ).one()
        assert deployment.last_deployed_at is not None

    def test_updates_existing_deployment_record(self, factory, target_org):
        composed_dashboard = factory.create_composed_dashboard()
        factory.create_composed_dashboard_deployment(
            composed_dashboard_id=composed_dashboard.id, organization_id=target_org.id
        )

        record_deployment(composed_dashboard, target_org)

        deployments = ComposedDashboardDeployment.query.filter_by(
            composed_dashboard_id=composed_dashboard.id, organization_id=target_org.id
        )
        assert deployments.count() == 1


class TestOrderedOrgAssignedSubdashboard:
    def test_returns_empty_list_when_no_assignments(self, factory, target_org):
        sub_dashboard = factory.create_dashboard()
        composed_dashboard = factory.create_composed_dashboard()
        factory.create_composed_dashboard_entry(
            composed_dashboard_id=composed_dashboard.id, template_dashboard_id=sub_dashboard.id
        )

        result = ordered_org_assigned_subdashboard(composed_dashboard, target_org)

        assert result == []

    def test_returns_assigned_dashboards_in_order(self, factory, target_org):
        sub_dashboard_1 = factory.create_dashboard()
        sub_dashboard_2 = factory.create_dashboard()
        factory.create_sub_dashboard_assignment(dashboard_id=sub_dashboard_1.id, organization_id=target_org.id)
        factory.create_sub_dashboard_assignment(dashboard_id=sub_dashboard_2.id, organization_id=target_org.id)
        composed_dashboard = factory.create_composed_dashboard()
        factory.create_composed_dashboard_entry(
            composed_dashboard_id=composed_dashboard.id,
            template_dashboard_id=sub_dashboard_1.id,
            order_index=0,
        )
        factory.create_composed_dashboard_entry(
            composed_dashboard_id=composed_dashboard.id,
            template_dashboard_id=sub_dashboard_2.id,
            order_index=1,
        )

        result = ordered_org_assigned_subdashboard(composed_dashboard, target_org)

        assert result == [sub_dashboard_1, sub_dashboard_2]


class TestDeployToTargetOrg:
    def test_creates_deployed_dashboard(self, factory, sub_dashboard, target_org):
        factory.create_widget(
            dashboard=sub_dashboard, options={"position": {"row": 0, "col": 0, "sizeX": 1, "sizeY": 1}}
        )
        query = sub_dashboard.widgets[0].visualization.query_rel
        factory.create_metr_data_source_for(query.data_source, "postgres")
        target_ds = factory.create_data_source(org=target_org)
        factory.create_metr_data_source_for(target_ds, "postgres")
        composed_dashboard = factory.create_composed_dashboard()
        factory.create_composed_dashboard_entry(
            composed_dashboard_id=composed_dashboard.id, template_dashboard_id=sub_dashboard.id
        )
        factory.create_sub_dashboard_assignment(dashboard_id=sub_dashboard.id, organization_id=target_org.id)
        factory.create_deploy_user(target_org)

        dashboard, _ = deploy_to_target_org(composed_dashboard, target_org)

        deployed = (
            Dashboard.query.join(MetrDashboard, Dashboard.id == MetrDashboard.dashboard_id)
            .filter(
                MetrDashboard.url_identifier == composed_dashboard.url_identifier,
                MetrDashboard.org_id == target_org.id,
            )
            .one()
        )
        assert deployed == dashboard
        assert deployed.name == composed_dashboard.name

    def test_deploys_as_the_engineering_admin_not_a_client_admin(self, factory, sub_dashboard, target_org):
        factory.create_widget(
            dashboard=sub_dashboard, options={"position": {"row": 0, "col": 0, "sizeX": 1, "sizeY": 1}}
        )
        query = sub_dashboard.widgets[0].visualization.query_rel
        factory.create_metr_data_source_for(query.data_source, "postgres")
        factory.create_metr_data_source_for(factory.create_data_source(org=target_org), "postgres")
        composed_dashboard = factory.create_composed_dashboard()
        factory.create_composed_dashboard_entry(
            composed_dashboard_id=composed_dashboard.id, template_dashboard_id=sub_dashboard.id
        )
        factory.create_sub_dashboard_assignment(dashboard_id=sub_dashboard.id, organization_id=target_org.id)
        # A client admin, created before ours so that taking the org's first admin would take them.
        factory.create_admin(org=target_org, email="client@example.com")
        deploy_user = factory.create_deploy_user(target_org)

        dashboard, _ = deploy_to_target_org(composed_dashboard, target_org)

        assert dashboard.user == deploy_user
        assert dashboard.widgets.first().visualization.query_rel.user == deploy_user

    def test_raises_when_the_org_has_no_engineering_admin(self, factory, sub_dashboard, target_org):
        factory.create_widget(
            dashboard=sub_dashboard, options={"position": {"row": 0, "col": 0, "sizeX": 1, "sizeY": 1}}
        )
        query = sub_dashboard.widgets[0].visualization.query_rel
        factory.create_metr_data_source_for(query.data_source, "postgres")
        factory.create_metr_data_source_for(factory.create_data_source(org=target_org), "postgres")
        composed_dashboard = factory.create_composed_dashboard()
        factory.create_composed_dashboard_entry(
            composed_dashboard_id=composed_dashboard.id, template_dashboard_id=sub_dashboard.id
        )
        factory.create_sub_dashboard_assignment(dashboard_id=sub_dashboard.id, organization_id=target_org.id)
        factory.create_admin(org=target_org, email="client@example.com")

        with pytest.raises(DeployUserError):
            deploy_to_target_org(composed_dashboard, target_org)

    def test_raises_on_validation_failure(self, factory, sub_dashboard, target_org):
        widget = factory.create_widget(dashboard=sub_dashboard)
        widget.visualization.query_rel.data_source.delete()
        composed_dashboard = factory.create_composed_dashboard()
        factory.create_composed_dashboard_entry(
            composed_dashboard_id=composed_dashboard.id, template_dashboard_id=sub_dashboard.id
        )
        factory.create_sub_dashboard_assignment(dashboard_id=sub_dashboard.id, organization_id=target_org.id)
        factory.create_deploy_user(target_org)

        with pytest.raises(DeploymentErrorGroup):
            deploy_to_target_org(composed_dashboard, target_org)

    def test_deploys_dashboard_with_query_based_parameters(self, factory, sub_dashboard, target_org):
        template_org = sub_dashboard.org
        template_ds = factory.create_data_source(org=template_org)
        factory.create_metr_data_source_for(template_ds, "postgres")

        dep_dashboard = factory.create_dashboard(org=template_org)
        dep_widget = factory.create_widget(dashboard=dep_dashboard)
        dep_query = dep_widget.visualization.query_rel
        dep_query.data_source = template_ds

        widget = factory.create_widget(
            dashboard=sub_dashboard, options={"position": {"row": 0, "col": 0, "sizeX": 1, "sizeY": 1}}
        )
        query = widget.visualization.query_rel
        query.data_source = template_ds
        query.options = {
            "parameters": [
                {"name": "dropdown_param", "type": "query", "queryId": dep_query.id},
            ]
        }

        target_ds = factory.create_data_source(org=target_org)
        factory.create_metr_data_source_for(target_ds, "postgres")

        composed_dashboard = factory.create_composed_dashboard()
        factory.create_composed_dashboard_entry(
            composed_dashboard_id=composed_dashboard.id, template_dashboard_id=sub_dashboard.id
        )
        factory.create_sub_dashboard_assignment(dashboard_id=sub_dashboard.id, organization_id=target_org.id)
        factory.create_deploy_user(target_org)

        deploy_to_target_org(composed_dashboard, target_org)

        deployed = (
            Dashboard.query.join(MetrDashboard, Dashboard.id == MetrDashboard.dashboard_id)
            .filter(
                MetrDashboard.url_identifier == composed_dashboard.url_identifier,
                MetrDashboard.org_id == target_org.id,
            )
            .one()
        )
        deployed_query = deployed.widgets[0].visualization.query_rel
        assert deployed_query.options["parameters"][0]["type"] == "query"
        assert deployed_query.options["parameters"][0]["queryId"] != dep_query.id


class TestExecuteQueryDependencies:
    def test_executes_dependent_queries(self, factory, target_org):
        template_org = factory.create_org()
        template_ds = factory.create_data_source(org=template_org)
        factory.create_metr_data_source_for(template_ds, "postgres")

        dep_dashboard = factory.create_dashboard(org=template_org)
        dep_widget = factory.create_widget(dashboard=dep_dashboard)
        dep_query = dep_widget.visualization.query_rel
        dep_query.data_source = template_ds

        widget = factory.create_widget(dashboard=factory.create_dashboard(org=template_org))
        query = widget.visualization.query_rel
        query.data_source = template_ds
        query.options = {
            "parameters": [
                {"name": "dropdown_param", "type": "query", "queryId": dep_query.id},
            ]
        }

        target_ds = factory.create_data_source(org=target_org)
        factory.create_metr_data_source_for(target_ds, "postgres")
        data_source_map = {"postgres": target_ds}

        deploy_user = factory.create_user(org=target_org)

        copied_query = get_or_copy_query(query, target_org, deploy_user, data_source_map, {})
        copied_dep_query_id = copied_query.options["parameters"][0]["queryId"]

        target_dashboard = factory.create_dashboard(org=target_org)
        visualization = factory.create_visualization(query_rel=copied_query)
        factory.create_widget(dashboard=target_dashboard, visualization=visualization)
        db.session.flush()

        with patch("redash_global.deployment.deploy.enqueue_query") as enqueue:
            execute_query_dependencies(target_dashboard)

        copied_dep_query = Query.query.get(copied_dep_query_id)
        assert copied_dep_query is not None
        assert enqueue.call_count == 1
        assert enqueue.call_args.args == (
            copied_dep_query.query_text,
            copied_dep_query.data_source,
            copied_dep_query.user_id,
        )
        assert enqueue.call_args.kwargs["metadata"] == {"query_id": copied_dep_query.id}

    def test_executes_the_allowed_widgets_query(self, factory, target_org):
        target_ds = factory.create_data_source(org=target_org)
        deploy_user = factory.create_user(org=target_org)
        allowed_widgets_query = factory.create_query(org=target_org, data_source=target_ds, user=deploy_user)
        dashboard = factory.create_dashboard(org=target_org)
        db.session.flush()

        with patch("redash_global.deployment.deploy.enqueue_query") as enqueue:
            execute_query_dependencies(dashboard, allowed_widgets_query)

        assert enqueue.call_count == 1
        assert enqueue.call_args.args == (
            allowed_widgets_query.query_text,
            allowed_widgets_query.data_source,
            allowed_widgets_query.user_id,
        )
        assert enqueue.call_args.kwargs["metadata"] == {"query_id": allowed_widgets_query.id}


class TestDeployComposedDashboard:
    def test_deploys_to_multiple_orgs(self, factory, sub_dashboard, admin):
        factory.create_widget(
            dashboard=sub_dashboard, options={"position": {"row": 0, "col": 0, "sizeX": 1, "sizeY": 1}}
        )
        query = sub_dashboard.widgets[0].visualization.query_rel
        factory.create_metr_data_source_for(query.data_source, "postgres")

        target_org_1 = factory.create_org()
        target_org_2 = factory.create_org()
        for org in (target_org_1, target_org_2):
            target_ds = factory.create_data_source(org=org)
            factory.create_metr_data_source_for(target_ds, "postgres")
            factory.create_sub_dashboard_assignment(dashboard_id=sub_dashboard.id, organization_id=org.id)
            factory.create_deploy_user(org)

        composed_dashboard = factory.create_composed_dashboard()
        factory.create_composed_dashboard_entry(
            composed_dashboard_id=composed_dashboard.id, template_dashboard_id=sub_dashboard.id
        )

        run = deploy_composed_dashboard(composed_dashboard, [target_org_1, target_org_2], admin)

        assert run.succeeded
        assert [result.organization_id for result in run.results] == [target_org_1.id, target_org_2.id]
        assert all(result.errors == [] for result in run.results)

    def test_records_the_admin_who_deployed(self, factory, sub_dashboard, admin):
        factory.create_widget(
            dashboard=sub_dashboard, options={"position": {"row": 0, "col": 0, "sizeX": 1, "sizeY": 1}}
        )
        query = sub_dashboard.widgets[0].visualization.query_rel
        factory.create_metr_data_source_for(query.data_source, "postgres")

        target_org = factory.create_org()
        factory.create_metr_data_source_for(factory.create_data_source(org=target_org), "postgres")
        factory.create_sub_dashboard_assignment(dashboard_id=sub_dashboard.id, organization_id=target_org.id)
        factory.create_deploy_user(target_org)

        composed_dashboard = factory.create_composed_dashboard()
        factory.create_composed_dashboard_entry(
            composed_dashboard_id=composed_dashboard.id, template_dashboard_id=sub_dashboard.id
        )

        run = deploy_composed_dashboard(composed_dashboard, [target_org], admin)

        assert run.global_admin_user_id == admin.id

    def test_rolls_back_every_org_when_one_fails(self, factory, sub_dashboard, admin):
        factory.create_widget(
            dashboard=sub_dashboard, options={"position": {"row": 0, "col": 0, "sizeX": 1, "sizeY": 1}}
        )
        query = sub_dashboard.widgets[0].visualization.query_rel
        factory.create_metr_data_source_for(query.data_source, "postgres")

        deployable_org = factory.create_org()
        target_ds = factory.create_data_source(org=deployable_org)
        factory.create_metr_data_source_for(target_ds, "postgres")

        # No data source carrying the "postgres" identifier, so this org fails validation.
        failing_org = factory.create_org()

        for org in (deployable_org, failing_org):
            factory.create_sub_dashboard_assignment(dashboard_id=sub_dashboard.id, organization_id=org.id)
            factory.create_deploy_user(org)

        composed_dashboard = factory.create_composed_dashboard()
        factory.create_composed_dashboard_entry(
            composed_dashboard_id=composed_dashboard.id, template_dashboard_id=sub_dashboard.id
        )

        run = deploy_composed_dashboard(composed_dashboard, [deployable_org, failing_org], admin)

        assert run.succeeded is False
        assert run.results[0].organization_id == deployable_org.id
        assert run.results[0].errors == []
        assert run.results[1].errors

        # .one() issues real SQL, so it proves the history is in the database and not merely
        # left over in the session after the rollback that erased the deployment itself.
        persisted = DeploymentRun.query.filter_by(composed_dashboard_id=composed_dashboard.id).one()
        assert persisted.id == run.id

        deployed = (
            Dashboard.query.join(MetrDashboard, Dashboard.id == MetrDashboard.dashboard_id)
            .filter(
                MetrDashboard.url_identifier == composed_dashboard.url_identifier,
                MetrDashboard.org_id == deployable_org.id,
            )
            .first()
        )
        assert deployed is None

    def test_rolls_back_every_org_when_several_orgs_in_the_middle_fail(self, factory, sub_dashboard, admin):
        factory.create_widget(
            dashboard=sub_dashboard, options={"position": {"row": 0, "col": 0, "sizeX": 1, "sizeY": 1}}
        )
        query = sub_dashboard.widgets[0].visualization.query_rel
        factory.create_metr_data_source_for(query.data_source, "postgres")

        deployable_orgs = [factory.create_org() for _ in range(3)]
        for org in deployable_orgs:
            factory.create_metr_data_source_for(factory.create_data_source(org=org), "postgres")

        # No data source carrying the "postgres" identifier, so these orgs fail validation.
        failing_orgs = [factory.create_org() for _ in range(2)]

        # The failures sit between healthy orgs: a savepoint that let its failure escape would
        # break the orgs attempted after it, and one that swallowed it would leave the second
        # failure unreported.
        target_orgs = [
            deployable_orgs[0],
            failing_orgs[0],
            deployable_orgs[1],
            failing_orgs[1],
            deployable_orgs[2],
        ]
        for org in target_orgs:
            factory.create_sub_dashboard_assignment(dashboard_id=sub_dashboard.id, organization_id=org.id)
            factory.create_deploy_user(org)

        composed_dashboard = factory.create_composed_dashboard()
        factory.create_composed_dashboard_entry(
            composed_dashboard_id=composed_dashboard.id, template_dashboard_id=sub_dashboard.id
        )

        run = deploy_composed_dashboard(composed_dashboard, target_orgs, admin)

        assert run.succeeded is False
        assert [result.organization_id for result in run.results] == [org.id for org in target_orgs]
        errors_by_org = {result.organization_id: result.errors for result in run.results}
        assert [bool(errors_by_org[org.id]) for org in target_orgs] == [False, True, False, True, False]

        deployment_run = DeploymentRun.query.filter_by(composed_dashboard_id=composed_dashboard.id).one()
        assert deployment_run.id == run.id
        assert len(deployment_run.results) == len(target_orgs)

        # Not one of the three healthy orgs kept a dashboard, including the ones
        # before the first failure.
        assert MetrDashboard.query.filter_by(url_identifier=composed_dashboard.url_identifier).count() == 0

    def test_records_unexpected_errors_instead_of_raising(self, factory, caplog, admin):
        target_org = factory.create_org()
        composed_dashboard = factory.create_composed_dashboard()

        # A RuntimeError stands in for the programming mistakes the narrower
        # (DeploymentError, SQLAlchemyError) catch used to let escape, which left the run
        # unrecorded even though recording every run is the point of the history table.
        with patch(
            "redash_global.deployment.deploy.deploy_to_target_org",
            side_effect=RuntimeError("boom"),
        ):
            run = deploy_composed_dashboard(composed_dashboard, [target_org], admin)

        assert run.succeeded is False
        assert run.results[0].errors == ["boom"]
        assert "Unexpected failure deploying composed dashboard" in caplog.text
        assert "RuntimeError: boom" in caplog.text
