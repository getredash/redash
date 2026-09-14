import logging
from collections import namedtuple
from copy import deepcopy
from datetime import datetime, timezone

from redash.models import (
    Dashboard,
    DashboardGroup,
    MetrDashboard,
    MetrDataSource,
    MetrQuery,
    Query,
    User,
    Visualization,
    Widget,
    db,
    metrWidget,
)
from redash.tasks.queries import enqueue_query
from redash_global.deployment.exceptions import (
    DeploymentError,
    DeploymentErrorGroup,
    DeployUserError,
)
from redash_global.deployment.utils import widgets_with_query
from redash_global.deployment.validations import (
    FIXED_FROM_URL_MAPPING_TYPE,
    validate_composed_dashboard,
)
from redash_global.models import (
    ComposedDashboardDeployment,
    DeploymentRun,
    DeploymentRunResult,
    SubDashboardAssignment,
)

logger = logging.getLogger(__name__)

OrgResult = namedtuple("OrgResult", ["org_id", "errors"])


def resolve_query_dropdown_dependencies(options, target_org, deploy_user, data_source_map, query_id_map):
    """Resolve query-based parameter dependencies before copying a query."""
    for parameter in options.get("parameters", []):
        if parameter.get("type") != "query":
            continue

        source_dep_id = parameter.get("queryId")
        if source_dep_id in query_id_map:
            parameter["queryId"] = query_id_map[source_dep_id]
            continue

        dependency_query = Query.query.get(source_dep_id)
        copied_dependency = get_or_copy_query(dependency_query, target_org, deploy_user, data_source_map, query_id_map)
        query_id_map[source_dep_id] = copied_dependency.id
        parameter["queryId"] = copied_dependency.id


def error_messages(error):
    if isinstance(error, DeploymentErrorGroup):
        return [str(inner) for inner in error.errors]
    return [str(error)]


def fixed_from_url_param_names(widget_options):
    mappings = (widget_options or {}).get("parameterMappings") or {}
    return {name for name, mapping in mappings.items() if (mapping or {}).get("type") == FIXED_FROM_URL_MAPPING_TYPE}


def clear_fixed_from_url_values(options, fixed_param_names):
    """Blank the stored value of every fixed-from-url parameter.

    A fixed-from-url parameter is filled from the dashboard URL, but the template query keeps
    whatever value it was last saved with. Copying that value over would make the deployed
    dashboard fall back to the template org's value whenever the URL doesn't carry one.
    """
    for parameter in options.get("parameters", []):
        if parameter.get("name") in fixed_param_names:
            parameter["value"] = None


def deploy_composed_dashboard(composed_dashboard, target_orgs, deployed_by, comment=None):
    """Deploy/redeploy one composed dashboard to every target org, all or nothing."""
    composed_dashboard_id = composed_dashboard.id
    deployed_by_id = deployed_by.id
    results = []
    deployed_dashboards = []

    for target_org in target_orgs:
        org_id = target_org.id
        try:
            # A savepoint contains a database-level failure, which would otherwise abort the
            # whole transaction and make every statement after it fail, so one broken org
            # does not stop the remaining ones from being attempted and reported.
            with db.session.begin_nested():
                deployed = deploy_to_target_org(composed_dashboard, target_org)
            deployed_dashboards.append(deployed)
            results.append(OrgResult(org_id, []))
        except DeploymentError as error:
            results.append(OrgResult(org_id, error_messages(error)))
        except Exception as error:
            # Not a DeploymentError, so this is a bug or an infrastructure failure rather
            # than a dashboard the admin can fix. It still gets recorded like any other org
            # failure.
            logger.exception(
                "Unexpected failure deploying composed dashboard %s to org %s",
                composed_dashboard_id,
                org_id,
            )
            results.append(OrgResult(org_id, error_messages(error)))

    succeeded = not any(result.errors for result in results)
    if succeeded:
        db.session.commit()
    else:
        db.session.rollback()

    run = record_deployment_run(composed_dashboard_id, deployed_by_id, results, succeeded, comment)
    db.session.commit()

    if succeeded:
        for dashboard, allowed_widgets_query in deployed_dashboards:
            execute_query_dependencies(dashboard, allowed_widgets_query)
    return run


def ordered_org_assigned_subdashboard(composed_dashboard, target_org):
    """The composed dashboard's entries, filtered to those assigned to target_org, in order_index order."""
    assigned_ids = {
        assignment.dashboard_id for assignment in SubDashboardAssignment.query.filter_by(organization_id=target_org.id)
    }
    return [
        Dashboard.query.get(entry.template_dashboard_id)
        for entry in composed_dashboard.entries
        if entry.template_dashboard_id in assigned_ids
    ]


def deploy_to_target_org(composed_dashboard, target_org):
    """Stage one org's dashboard and return it with its allowed-widgets query.

    The caller only passes orgs that have at least one of the composed dashboard's
    sub-dashboards assigned (that is what ``deployment_target_orgs`` selects on), so there is
    always something here to deploy.

    Raises on failure; the caller owns the transaction.
    """
    sub_dashboards = ordered_org_assigned_subdashboard(composed_dashboard, target_org)
    validate_composed_dashboard(sub_dashboards, target_org)

    deploy_user = get_deploy_user(target_org)
    target_data_sources_map = get_target_data_sources(sub_dashboards, target_org)
    query_id_map = {}
    allowed_widgets_query = copy_allowed_widgets_query(
        sub_dashboards, target_org, deploy_user, target_data_sources_map, query_id_map
    )
    allowed_widgets_identifier = allowed_widgets_query.metr_query.query_identifier if allowed_widgets_query else None
    dashboard = get_or_create_dashboard(composed_dashboard, target_org, deploy_user, allowed_widgets_identifier)
    replace_widgets(dashboard, sub_dashboards, target_org, deploy_user, target_data_sources_map, query_id_map)
    record_deployment(composed_dashboard, target_org)
    return dashboard, allowed_widgets_query


def get_deploy_user(target_org):
    email = f"engineering+{target_org.slug}@metr.systems"
    deploy_user = User.query.filter(User.org_id == target_org.id, User.email == email).first()
    if deploy_user is None:
        raise DeployUserError(f"Organization {target_org.id} has no deploy user '{email}'")
    return deploy_user


def get_target_data_sources(sub_dashboards, target_org):
    identifiers = set()
    for sub_dashboard in sub_dashboards:
        for widget in widgets_with_query(sub_dashboard):
            query = widget.visualization.query_rel
            if query.data_source_id is not None:
                metr_data_source = query.data_source.metr_data_source
                if metr_data_source is not None:
                    identifiers.add(metr_data_source.data_source_identifier)

            # Also collect data sources from parameter queries
            options = query.options or {}
            for parameter in options.get("parameters", []):
                if parameter.get("type") == "query":
                    param_query_id = parameter.get("queryId")
                    if param_query_id:
                        param_query = Query.query.get(param_query_id)
                        if param_query and param_query.data_source_id is not None:
                            param_metr_data_source = param_query.data_source.metr_data_source
                            if param_metr_data_source is not None:
                                identifiers.add(param_metr_data_source.data_source_identifier)

    return {
        metr_data_source.data_source_identifier: metr_data_source.data_source
        for metr_data_source in MetrDataSource.query.filter(
            MetrDataSource.org_id == target_org.id,
            MetrDataSource.data_source_identifier.in_(identifiers),
        )
    }


def get_or_copy_query(
    template_query, target_org, deploy_user, data_source_map, query_id_map=None, fixed_param_names=None
):
    if query_id_map is None:
        query_id_map = {}

    options = deepcopy(template_query.options) if template_query.options else {}
    resolve_query_dropdown_dependencies(options, target_org, deploy_user, data_source_map, query_id_map)
    clear_fixed_from_url_values(options, fixed_param_names or set())

    identifier = template_query.data_source.metr_data_source.data_source_identifier
    target_data_source = data_source_map[identifier]

    metr_query = (
        db.session.query(MetrQuery)
        .filter(MetrQuery.org_id == target_org.id, MetrQuery.template_query_id == template_query.id)
        .first()
    )
    if metr_query:
        query = metr_query.query
        query.name = template_query.name
        query.query_text = template_query.query_text
        query.options = options
        query.data_source = target_data_source
        query.schedule = deepcopy(template_query.schedule)
        return query

    # Bare constructor, not Query.create(...): Query.create always adds a "Table" TABLE
    # visualization, which would collide with the visualization copy_widget/copy_allowed_widgets_query
    # already builds. Query.fork (redash/models/__init__.py:798-820) avoids the same collision
    # the same way.
    query = Query(
        org=target_org,
        data_source=target_data_source,
        user=deploy_user,
        name=template_query.name,
        query_text=template_query.query_text,
        options=options,
        schedule=deepcopy(template_query.schedule),
    )
    db.session.add(query)
    db.session.flush()
    db.session.add(MetrQuery(query=query, org_id=target_org.id, template_query_id=template_query.id))
    return query


def copy_allowed_widgets_query(sub_dashboards, target_org, deploy_user, data_source_map, query_id_map=None):
    if query_id_map is None:
        query_id_map = {}

    metr_dashboard = sub_dashboards[0].metr_dashboard
    identifier = metr_dashboard.allowed_widget_query_identifier if metr_dashboard else None
    if identifier is None:
        return None

    template_org = sub_dashboards[0].org
    template_query = (
        db.session.query(Query)
        .join(MetrQuery, MetrQuery.query_id == Query.id)
        .filter(MetrQuery.org_id == template_org.id, MetrQuery.query_identifier == identifier)
        .first()
    )

    query = get_or_copy_query(template_query, target_org, deploy_user, data_source_map, query_id_map)
    query.metr_query.query_identifier = identifier
    return query


def copy_widget(template_widget, dashboard, target_org, deploy_user, data_source_map, row_offset, query_id_map=None):
    if query_id_map is None:
        query_id_map = {}

    options = deepcopy(template_widget.options) if template_widget.options else {}
    position = dict(options.get("position") or {})
    position["row"] = position.get("row", 0) + row_offset
    options["position"] = position

    visualization = None
    if template_widget.visualization_id is not None:
        template_query = template_widget.visualization.query_rel
        query = get_or_copy_query(
            template_query,
            target_org,
            deploy_user,
            data_source_map,
            query_id_map,
            fixed_from_url_param_names(options),
        )
        visualization = Visualization(
            query_rel=query,
            type=template_widget.visualization.type,
            name=template_widget.visualization.name,
            description=template_widget.visualization.description,
            options=deepcopy(template_widget.visualization.options) if template_widget.visualization.options else None,
        )
        db.session.add(visualization)
        db.session.flush()

    widget = Widget(
        dashboard=dashboard,
        visualization=visualization,
        text=template_widget.text,
        width=template_widget.width,
        options=options,
    )
    db.session.add(widget)
    db.session.flush()

    template_metr_widget = template_widget.metr_widget
    if template_metr_widget and template_metr_widget.tags:
        db.session.add(metrWidget(widget=widget, tags=list(template_metr_widget.tags)))

    return widget


def delete_orphaned_visualizations(visualization_ids):
    for visualization_id in visualization_ids:
        visualization = Visualization.query.get(visualization_id)
        if visualization is None or Widget.query.filter_by(visualization_id=visualization_id).first() is not None:
            continue
        query = visualization.query_rel
        db.session.delete(visualization)
        db.session.flush()
        if not query.visualizations:
            db.session.delete(query)
    db.session.flush()


def replace_widgets(dashboard, sub_dashboards, target_org, deploy_user, data_source_map, query_id_map=None):
    if query_id_map is None:
        query_id_map = {}

    old_widgets = dashboard.widgets.all()
    old_visualization_ids = {widget.visualization_id for widget in old_widgets if widget.visualization_id is not None}
    for widget in old_widgets:
        db.session.delete(widget)
    db.session.flush()

    row_offset = 0
    for sub_dashboard in sub_dashboards:
        sub_dashboard_height = 0
        for template_widget in sub_dashboard.widgets:
            copy_widget(template_widget, dashboard, target_org, deploy_user, data_source_map, row_offset, query_id_map)
            position = (template_widget.options or {}).get("position") or {}
            sub_dashboard_height = max(sub_dashboard_height, position.get("row", 0) + position.get("sizeY", 0))
        row_offset += sub_dashboard_height

    # Anything from the old widget set that step above didn't recreate (the template dropped
    # that widget) is now genuinely orphaned.
    delete_orphaned_visualizations(old_visualization_ids)


def create_dashboard(composed_dashboard, target_org, deploy_user):
    dashboard = Dashboard(
        name=composed_dashboard.name,
        org=target_org,
        user=deploy_user,
        # Redeploy goes through get_or_create_dashboard,
        # which never touches is_draft
        is_draft=True,
        layout=[],
    )
    db.session.add(dashboard)
    db.session.flush()
    db.session.add(DashboardGroup(dashboard=dashboard, group=target_org.default_group))
    db.session.add(
        MetrDashboard(
            dashboard=dashboard,
            org_id=target_org.id,
            url_identifier=composed_dashboard.url_identifier,
        )
    )
    db.session.flush()
    return dashboard


def get_or_create_dashboard(composed_dashboard, target_org, deploy_user, allowed_widgets_identifier):
    dashboard = (
        Dashboard.query.join(MetrDashboard, Dashboard.id == MetrDashboard.dashboard_id)
        .filter(
            MetrDashboard.url_identifier == composed_dashboard.url_identifier,
            MetrDashboard.org_id == target_org.id,
        )
        .first()
    )
    if dashboard:
        dashboard.name = composed_dashboard.name
    else:
        dashboard = create_dashboard(composed_dashboard, target_org, deploy_user)

    dashboard.metr_dashboard.allowed_widget_query_identifier = allowed_widgets_identifier
    return dashboard


def execute_query_dependencies(dashboard, allowed_widgets_query=None):
    """Enqueue the queries the dashboard needs cached results for: parameter dropdowns and allowed widgets."""
    dependencies = [allowed_widgets_query] if allowed_widgets_query else []

    for widget in dashboard.widgets:
        if widget.visualization_id:
            query = widget.visualization.query_rel
            for parameter in query.parameters:
                if parameter.get("type") == "query":
                    dep_query = Query.query.get(parameter["queryId"]) if parameter.get("queryId") else None
                    if dep_query:
                        dependencies.append(dep_query)

    enqueued = set()
    for query in dependencies:
        if query.id in enqueued or query.data_source is None:
            continue
        try:
            enqueue_query(
                query.query_text,
                query.data_source,
                query.user_id,
                metadata={"query_id": query.id},
            )
            enqueued.add(query.id)
        except Exception:
            pass


def record_deployment(composed_dashboard, target_org):
    deployment = ComposedDashboardDeployment.query.filter_by(
        composed_dashboard_id=composed_dashboard.id, organization_id=target_org.id
    ).first()
    if deployment is None:
        deployment = ComposedDashboardDeployment(
            composed_dashboard_id=composed_dashboard.id, organization_id=target_org.id
        )
        db.session.add(deployment)
    # A plain Python-side timestamp, not func.now(): this app's session uses
    # expire_on_commit=False, so a func.now() value would stay an unresolved SQL construct on
    # this attribute after commit instead of refreshing to the real value.
    deployment.last_deployed_at = datetime.now(timezone.utc)


def record_deployment_run(composed_dashboard_id, deployed_by_id, results, succeeded, comment):
    run = DeploymentRun(
        composed_dashboard_id=composed_dashboard_id,
        global_admin_user_id=deployed_by_id,
        succeeded=succeeded,
        comment=comment,
        results=[DeploymentRunResult(organization_id=result.org_id, errors=result.errors) for result in results],
    )
    db.session.add(run)
    return run
