from redash.models import Organization, db
from redash_global import settings
from redash_global.models import SubDashboardAssignment


def widgets_with_query(sub_dashboard):
    """Widgets that have a visualization, and therefore a query. Excludes text-box widgets."""
    return [widget for widget in sub_dashboard.widgets if widget.visualization_id is not None]


def deployment_target_orgs(composed_dashboard):
    """Every org that has at least one of this composed dashboard's entries assigned, by name.

    Assignment is what makes an org a target: an org with none of the entries assigned has
    nothing of this composed dashboard to deploy.
    """
    entry_dashboard_ids = [entry.template_dashboard_id for entry in composed_dashboard.entries]
    if not entry_dashboard_ids:
        return []

    return (
        db.session.query(Organization)
        .join(SubDashboardAssignment, SubDashboardAssignment.organization_id == Organization.id)
        .filter(
            SubDashboardAssignment.dashboard_id.in_(entry_dashboard_ids),
            Organization.slug.notin_(settings.ORG_SLUGS_EXCLUDED_FROM_DEPLOYMENT),
        )
        .order_by(Organization.name)
        .distinct()
        .all()
    )
