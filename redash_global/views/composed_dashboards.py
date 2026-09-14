from flask import jsonify, request
from flask_login import current_user, login_required
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import joinedload, selectinload

from redash.models import Organization, db
from redash_global.deployment.deploy import deploy_composed_dashboard
from redash_global.deployment.utils import deployment_target_orgs
from redash_global.models import (
    ComposedDashboard,
    ComposedDashboardEntry,
    DeploymentRun,
)


def serialize(composed_dashboard):
    return {
        "id": composed_dashboard.id,
        "name": composed_dashboard.name,
        "url_identifier": composed_dashboard.url_identifier,
        "created_at": composed_dashboard.created_at,
        "updated_at": composed_dashboard.updated_at,
    }


MAX_PAGE_SIZE = 100


def positive_int_arg(name, default, maximum=None):
    try:
        value = max(int(request.args.get(name, default)), 1)
    except (ValueError, TypeError):
        value = default
    return value if maximum is None else min(value, maximum)


@login_required
def composed_dashboards_list():
    page = positive_int_arg("page", 1)
    page_size = positive_int_arg("page_size", 25, MAX_PAGE_SIZE)

    query = ComposedDashboard.query.order_by(ComposedDashboard.created_at.desc())

    total = query.count()
    composed_dashboards = query.offset((page - 1) * page_size).limit(page_size).all()

    return jsonify(
        {
            "count": total,
            "page": page,
            "page_size": page_size,
            "results": [serialize(cd) for cd in composed_dashboards],
        }
    )


@login_required
def composed_dashboard_detail(composed_dashboard_id):
    composed_dashboard = ComposedDashboard.query.get_or_404(composed_dashboard_id)
    return jsonify(serialize(composed_dashboard))


@login_required
def composed_dashboard_create():
    body = request.get_json(silent=True) or {}
    name = body.get("name")
    url_identifier = body.get("url_identifier")

    composed_dashboard = ComposedDashboard(name=name, url_identifier=url_identifier)
    db.session.add(composed_dashboard)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"message": "A dashboard with this URL identifier already exists."}), 409

    return jsonify(serialize(composed_dashboard)), 201


@login_required
def composed_dashboard_delete(composed_dashboard_id):
    composed_dashboard = ComposedDashboard.query.get_or_404(composed_dashboard_id)
    db.session.delete(composed_dashboard)
    db.session.commit()
    return "", 204


def serialize_entry(entry):
    return {
        "id": entry.id,
        "composed_dashboard_id": entry.composed_dashboard_id,
        "template_dashboard_id": entry.template_dashboard_id,
        "order_index": entry.order_index,
    }


@login_required
def composed_dashboard_entries_list(composed_dashboard_id):
    composed_dashboard = ComposedDashboard.query.get_or_404(composed_dashboard_id)
    entries = composed_dashboard.entries
    return jsonify([serialize_entry(entry) for entry in entries])


@login_required
def composed_dashboard_entry_create(composed_dashboard_id):
    ComposedDashboard.query.get_or_404(composed_dashboard_id)
    body = request.get_json(silent=True) or {}
    template_dashboard_id = body.get("template_dashboard_id")

    max_order = (
        db.session.query(db.func.max(ComposedDashboardEntry.order_index))
        .filter(ComposedDashboardEntry.composed_dashboard_id == composed_dashboard_id)
        .scalar()
    )
    next_order = (max_order + 1) if max_order is not None else 0

    entry = ComposedDashboardEntry(
        composed_dashboard_id=composed_dashboard_id,
        template_dashboard_id=template_dashboard_id,
        order_index=next_order,
    )
    db.session.add(entry)
    db.session.commit()

    return jsonify(serialize_entry(entry)), 201


@login_required
def composed_dashboard_entry_delete(composed_dashboard_id, entry_id):
    entry = ComposedDashboardEntry.query.filter_by(
        id=entry_id, composed_dashboard_id=composed_dashboard_id
    ).first_or_404()

    db.session.delete(entry)
    db.session.commit()
    return "", 204


@login_required
def composed_dashboard_entries_reorder(composed_dashboard_id):
    composed_dashboard = ComposedDashboard.query.get_or_404(composed_dashboard_id)
    body = request.get_json(silent=True) or {}
    entry_ids = body.get("entry_ids", [])

    for order_index, entry_id in enumerate(entry_ids):
        entry = ComposedDashboardEntry.query.filter_by(
            id=entry_id, composed_dashboard_id=composed_dashboard_id
        ).first_or_404()
        entry.order_index = order_index

    db.session.commit()
    return jsonify([serialize_entry(entry) for entry in composed_dashboard.entries])


def serialize_run_result(result, org):
    return {
        "organization_id": result.organization_id,
        "organization_name": org.name,
        "organization_slug": org.slug,
        "errors": result.errors,
    }


def orgs_by_id_for_runs(runs):
    """The organizations named by these runs' results, keyed by id, in one query.

    Resolved from the results rather than from the composed dashboard's current target orgs:
    an old run can name an org that is no longer a target.
    """
    org_ids = {result.organization_id for run in runs for result in run.results}
    return {org.id: org for org in Organization.query.filter(Organization.id.in_(org_ids))}


def serialize_run(run, orgs_by_id):
    results = sorted(run.results, key=lambda result: orgs_by_id[result.organization_id].name)
    return {
        "id": run.id,
        "composed_dashboard_id": run.composed_dashboard_id,
        "created_at": run.created_at,
        "succeeded": run.succeeded,
        "comment": run.comment,
        "deployed_by": run.global_admin_user.username,
        "results": [serialize_run_result(result, orgs_by_id[result.organization_id]) for result in results],
    }


@login_required
def composed_dashboard_deploy(composed_dashboard_id):
    composed_dashboard = ComposedDashboard.query.get_or_404(composed_dashboard_id)
    target_orgs = deployment_target_orgs(composed_dashboard)
    if not target_orgs:
        return jsonify({"message": "No organization has any of this dashboard's sub-dashboards assigned to it."}), 400

    body = request.get_json(silent=True) or {}
    comment = (body.get("comment") or "").strip() or None

    run = deploy_composed_dashboard(composed_dashboard, target_orgs, current_user, comment)
    return jsonify(serialize_run(run, orgs_by_id_for_runs([run])))


@login_required
def composed_dashboard_deployment_runs_list(composed_dashboard_id):
    ComposedDashboard.query.get_or_404(composed_dashboard_id)

    page = positive_int_arg("page", 1)
    page_size = positive_int_arg("page_size", 25, MAX_PAGE_SIZE)

    query = DeploymentRun.query.filter_by(composed_dashboard_id=composed_dashboard_id)
    total = query.count()
    runs = (
        query.options(selectinload(DeploymentRun.results), joinedload(DeploymentRun.global_admin_user))
        .order_by(DeploymentRun.created_at.desc(), DeploymentRun.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    orgs_by_id = orgs_by_id_for_runs(runs)

    return jsonify(
        {
            "count": total,
            "page": page,
            "page_size": page_size,
            "results": [serialize_run(run, orgs_by_id) for run in runs],
        }
    )
