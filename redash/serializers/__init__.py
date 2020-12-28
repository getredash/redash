"""
This will eventually replace all the `to_dict` methods of the different model
classes we have. This will ensure cleaner code and better
separation of concerns.
"""
from funcy import project

from flask_login import current_user
from rq.job import JobStatus
from rq.timeouts import JobTimeoutException

from redash import models
from redash.permissions import has_access, view_only
from redash.utils import json_loads
from redash.models.parameterized_query import ParameterizedQuery


from .query_result import (
    serialize_query_result,
    serialize_query_result_to_dsv,
    serialize_query_result_to_xlsx,
)


def public_widget(widget):
    res = {
        "id": widget.id,
        "width": widget.width,
        "options": json_loads(widget.options),
        "text": widget.text,
        "updated_at": widget.updated_at,
        "created_at": widget.created_at,
    }

    v = widget.visualization
    if v and v.id:
        res["visualization"] = {
            "type": v.type,
            "name": v.name,
            "description": v.description,
            "options": json_loads(v.options),
            "updated_at": v.updated_at,
            "created_at": v.created_at,
            "query": {
                "id": v.query_rel.id,
                "name": v.query_rel.name,
                "description": v.query_rel.description,
                "options": v.query_rel.options,
            },
        }

    return res


def public_dashboard(dashboard):
    dashboard_dict = project(
        serialize_dashboard(dashboard, with_favorite_state=False),
        ("name", "layout", "dashboard_filters_enabled", "updated_at", "created_at", "options"),
    )

    widget_list = (
        models.Widget.query.filter(models.Widget.dashboard_id == dashboard.id)
        .outerjoin(models.Visualization)
        .outerjoin(models.Query)
    )

    dashboard_dict["widgets"] = [public_widget(w) for w in widget_list]
    return dashboard_dict


class Serializer(object):
    pass


class QuerySerializer(Serializer):
    def __init__(self, object_or_list, **kwargs):
        self.object_or_list = object_or_list
        self.options = kwargs

    def serialize(self):
        if isinstance(self.object_or_list, models.Query):
            result = serialize_query(self.object_or_list, **self.options)
            if (
                self.options.get("with_favorite_state", True)
                and not current_user.is_api_user()
            ):
                result["is_favorite"] = models.Favorite.is_favorite(
                    current_user.id, self.object_or_list
                )
        else:
            result = [
                serialize_query(query, **self.options) for query in self.object_or_list
            ]
            if self.options.get("with_favorite_state", True):
                favorite_ids = models.Favorite.are_favorites(
                    current_user.id, self.object_or_list
                )
                for query in result:
                    query["is_favorite"] = query["id"] in favorite_ids

        return result


def serialize_query(
    query,
    with_stats=False,
    with_visualizations=False,
    with_user=True,
    with_last_modified_by=True,
):
    d = {
        "id": query.id,
        "latest_query_data_id": query.latest_query_data_id,
        "name": query.name,
        "description": query.description,
        "query": query.query_text,
        "query_hash": query.query_hash,
        "schedule": query.schedule,
        "api_key": query.api_key,
        "is_archived": query.is_archived,
        "is_draft": query.is_draft,
        "updated_at": query.updated_at,
        "created_at": query.created_at,
        "data_source_id": query.data_source_id,
        "options": query.options,
        "version": query.version,
        "tags": query.tags or [],
        "is_safe": query.parameterized.is_safe,
    }

    if with_user:
        d["user"] = query.user.to_dict()
    else:
        d["user_id"] = query.user_id

    if with_last_modified_by:
        d["last_modified_by"] = (
            query.last_modified_by.to_dict()
            if query.last_modified_by is not None
            else None
        )
    else:
        d["last_modified_by_id"] = query.last_modified_by_id

    if with_stats:
        if query.latest_query_data is not None:
            d["retrieved_at"] = query.retrieved_at
            d["runtime"] = query.runtime
        else:
            d["retrieved_at"] = None
            d["runtime"] = None

    if with_visualizations:
        d["visualizations"] = [
            serialize_visualization(vis, with_query=False)
            for vis in query.visualizations
        ]

    return d


def serialize_visualization(object, with_query=True):
    d = {
        "id": object.id,
        "type": object.type,
        "name": object.name,
        "description": object.description,
        "options": json_loads(object.options),
        "updated_at": object.updated_at,
        "created_at": object.created_at,
    }

    if with_query:
        d["query"] = serialize_query(object.query_rel)

    return d


def serialize_widget(object):
    d = {
        "id": object.id,
        "width": object.width,
        "options": json_loads(object.options),
        "dashboard_id": object.dashboard_id,
        "text": object.text,
        "updated_at": object.updated_at,
        "created_at": object.created_at,
    }

    if object.visualization and object.visualization.id:
        d["visualization"] = serialize_visualization(object.visualization)

    return d


def serialize_alert(alert, full=True):
    d = {
        "id": alert.id,
        "name": alert.name,
        "options": alert.options,
        "state": alert.state,
        "last_triggered_at": alert.last_triggered_at,
        "updated_at": alert.updated_at,
        "created_at": alert.created_at,
        "rearm": alert.rearm,
    }

    if full:
        d["query"] = serialize_query(alert.query_rel)
        d["user"] = alert.user.to_dict()
    else:
        d["query_id"] = alert.query_id
        d["user_id"] = alert.user_id

    return d


def serialize_dashboard(obj, with_widgets=False, user=None, with_favorite_state=True):
    layout = json_loads(obj.layout)

    widgets = []

    if with_widgets:
        for w in obj.widgets:
            if w.visualization_id is None:
                widgets.append(serialize_widget(w))
            elif user and has_access(w.visualization.query_rel, user, view_only):
                widgets.append(serialize_widget(w))
            else:
                widget = project(
                    serialize_widget(w),
                    (
                        "id",
                        "width",
                        "dashboard_id",
                        "options",
                        "created_at",
                        "updated_at",
                    ),
                )
                widget["restricted"] = True
                widgets.append(widget)
    else:
        widgets = None

    d = {
        "id": obj.id,
        "slug": obj.name_as_slug,
        "name": obj.name,
        "user_id": obj.user_id,
        "user": {
            "id": obj.user.id,
            "name": obj.user.name,
            "email": obj.user.email,
            "profile_image_url": obj.user.profile_image_url,
        },
        "layout": layout,
        "dashboard_filters_enabled": obj.dashboard_filters_enabled,
        "widgets": widgets,
        "options": obj.options,
        "is_archived": obj.is_archived,
        "is_draft": obj.is_draft,
        "tags": obj.tags or [],
        "updated_at": obj.updated_at,
        "created_at": obj.created_at,
        "version": obj.version,
    }

    return d


class DashboardSerializer(Serializer):
    def __init__(self, object_or_list, **kwargs):
        self.object_or_list = object_or_list
        self.options = kwargs

    def serialize(self):
        if isinstance(self.object_or_list, models.Dashboard):
            result = serialize_dashboard(self.object_or_list, **self.options)
            if (
                self.options.get("with_favorite_state", True)
                and not current_user.is_api_user()
            ):
                result["is_favorite"] = models.Favorite.is_favorite(
                    current_user.id, self.object_or_list
                )
        else:
            result = [
                serialize_dashboard(obj, **self.options) for obj in self.object_or_list
            ]
            if self.options.get("with_favorite_state", True):
                favorite_ids = models.Favorite.are_favorites(
                    current_user.id, self.object_or_list
                )
                for obj in result:
                    obj["is_favorite"] = obj["id"] in favorite_ids

        return result


def serialize_job(job):
    # TODO: this is mapping to the old Job class statuses. Need to update the client side and remove this
    STATUSES = {
        JobStatus.QUEUED: 1,
        JobStatus.STARTED: 2,
        JobStatus.FINISHED: 3,
        JobStatus.FAILED: 4,
    }

    job_status = job.get_status()
    if job.is_started:
        updated_at = job.started_at or 0
    else:
        updated_at = 0

    status = STATUSES[job_status]
    result = query_result_id = None

    if job.is_cancelled:
        error = "Query cancelled by user."
        status = 4
    elif isinstance(job.result, Exception):
        error = str(job.result)
        status = 4
    elif isinstance(job.result, dict) and "error" in job.result:
        error = job.result["error"]
        status = 4
    else:
        error = ""
        result = query_result_id = job.result

    return {
        "job": {
            "id": job.id,
            "updated_at": updated_at,
            "status": status,
            "error": error,
            "result": result,
            "query_result_id": query_result_id,
        }
    }
