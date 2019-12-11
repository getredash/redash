from flask import request, url_for
from funcy import project, partial

from flask_restful import abort
from redash import models, serializers
from redash.handlers.base import (
    BaseResource,
    get_object_or_404,
    paginate,
    filter_by_tags,
    order_results as _order_results,
)
from redash.permissions import (
    can_modify,
    require_admin_or_owner,
    require_object_modify_permission,
    require_permission,
)
from redash.security import csp_allows_embeding
from redash.serializers import serialize_dashboard
from sqlalchemy.orm.exc import StaleDataError


# Ordering map for relationships
order_map = {
    "name": "lowercase_name",
    "-name": "-lowercase_name",
    "created_at": "created_at",
    "-created_at": "-created_at",
}

order_results = partial(
    _order_results, default_order="-created_at", allowed_orders=order_map
)


class DashboardListResource(BaseResource):
    @require_permission("list_dashboards")
    def get(self):
        """
        Lists all accessible dashboards.

        :qparam number page_size: Number of queries to return per page
        :qparam number page: Page number to retrieve
        :qparam number order: Name of column to order by
        :qparam number q: Full text search term

        Responds with an array of :ref:`dashboard <dashboard-response-label>`
        objects.
        """
        search_term = request.args.get("q")

        if search_term:
            results = models.Dashboard.search(
                self.current_org,
                self.current_user.group_ids,
                self.current_user.id,
                search_term,
            )
        else:
            results = models.Dashboard.all(
                self.current_org, self.current_user.group_ids, self.current_user.id
            )

        results = filter_by_tags(results, models.Dashboard.tags)

        # order results according to passed order parameter,
        # special-casing search queries where the database
        # provides an order by search rank
        ordered_results = order_results(results, fallback=not bool(search_term))

        page = request.args.get("page", 1, type=int)
        page_size = request.args.get("page_size", 25, type=int)

        response = paginate(
            ordered_results,
            page=page,
            page_size=page_size,
            serializer=serialize_dashboard,
        )

        if search_term:
            self.record_event(
                {"action": "search", "object_type": "dashboard", "term": search_term}
            )
        else:
            self.record_event({"action": "list", "object_type": "dashboard"})

        return response

    @require_permission("create_dashboard")
    def post(self):
        """
        Creates a new dashboard.

        :<json string name: Dashboard name

        Responds with a :ref:`dashboard <dashboard-response-label>`.
        """
        dashboard_properties = request.get_json(force=True)
        dashboard = models.Dashboard(
            name=dashboard_properties["name"],
            org=self.current_org,
            user=self.current_user,
            is_draft=True,
            layout="[]",
        )
        models.db.session.add(dashboard)
        models.db.session.commit()
        return serialize_dashboard(dashboard)


class DashboardResource(BaseResource):
    @require_permission("list_dashboards")
    def get(self, dashboard_slug=None):
        """
        Retrieves a dashboard.

        :qparam string slug: Slug of dashboard to retrieve.

        .. _dashboard-response-label:

        :>json number id: Dashboard ID
        :>json string name:
        :>json string slug:
        :>json number user_id: ID of the dashboard creator
        :>json string created_at: ISO format timestamp for dashboard creation
        :>json string updated_at: ISO format timestamp for last dashboard modification
        :>json number version: Revision number of dashboard
        :>json boolean dashboard_filters_enabled: Whether filters are enabled or not
        :>json boolean is_archived: Whether this dashboard has been removed from the index or not
        :>json boolean is_draft: Whether this dashboard is a draft or not.
        :>json array layout: Array of arrays containing widget IDs, corresponding to the rows and columns the widgets are displayed in
        :>json array widgets: Array of arrays containing :ref:`widget <widget-response-label>` data

        .. _widget-response-label:

        Widget structure:

        :>json number widget.id: Widget ID
        :>json number widget.width: Widget size
        :>json object widget.options: Widget options
        :>json number widget.dashboard_id: ID of dashboard containing this widget
        :>json string widget.text: Widget contents, if this is a text-box widget
        :>json object widget.visualization: Widget contents, if this is a visualization widget
        :>json string widget.created_at: ISO format timestamp for widget creation
        :>json string widget.updated_at: ISO format timestamp for last widget modification
        """
        dashboard = get_object_or_404(
            models.Dashboard.get_by_slug_and_org, dashboard_slug, self.current_org
        )
        response = serialize_dashboard(
            dashboard, with_widgets=True, user=self.current_user
        )

        api_key = models.ApiKey.get_by_object(dashboard)
        if api_key:
            response["public_url"] = url_for(
                "redash.public_dashboard",
                token=api_key.api_key,
                org_slug=self.current_org.slug,
                _external=True,
            )
            response["api_key"] = api_key.api_key

        response["can_edit"] = can_modify(dashboard, self.current_user)

        self.record_event(
            {"action": "view", "object_id": dashboard.id, "object_type": "dashboard"}
        )

        return response

    @require_permission("edit_dashboard")
    def post(self, dashboard_slug):
        """
        Modifies a dashboard.

        :qparam string slug: Slug of dashboard to retrieve.

        Responds with the updated :ref:`dashboard <dashboard-response-label>`.

        :status 200: success
        :status 409: Version conflict -- dashboard modified since last read
        """
        dashboard_properties = request.get_json(force=True)
        # TODO: either convert all requests to use slugs or ids
        dashboard = models.Dashboard.get_by_id_and_org(dashboard_slug, self.current_org)

        require_object_modify_permission(dashboard, self.current_user)

        updates = project(
            dashboard_properties,
            (
                "name",
                "layout",
                "version",
                "tags",
                "is_draft",
                "dashboard_filters_enabled",
            ),
        )

        # SQLAlchemy handles the case where a concurrent transaction beats us
        # to the update. But we still have to make sure that we're not starting
        # out behind.
        if "version" in updates and updates["version"] != dashboard.version:
            abort(409)

        updates["changed_by"] = self.current_user

        self.update_model(dashboard, updates)
        models.db.session.add(dashboard)
        try:
            models.db.session.commit()
        except StaleDataError:
            abort(409)

        result = serialize_dashboard(
            dashboard, with_widgets=True, user=self.current_user
        )

        self.record_event(
            {"action": "edit", "object_id": dashboard.id, "object_type": "dashboard"}
        )

        return result

    @require_permission("edit_dashboard")
    def delete(self, dashboard_slug):
        """
        Archives a dashboard.

        :qparam string slug: Slug of dashboard to retrieve.

        Responds with the archived :ref:`dashboard <dashboard-response-label>`.
        """
        dashboard = models.Dashboard.get_by_slug_and_org(
            dashboard_slug, self.current_org
        )
        dashboard.is_archived = True
        dashboard.record_changes(changed_by=self.current_user)
        models.db.session.add(dashboard)
        d = serialize_dashboard(dashboard, with_widgets=True, user=self.current_user)
        models.db.session.commit()

        self.record_event(
            {"action": "archive", "object_id": dashboard.id, "object_type": "dashboard"}
        )

        return d


class PublicDashboardResource(BaseResource):
    decorators = BaseResource.decorators + [csp_allows_embeding]

    def get(self, token):
        """
        Retrieve a public dashboard.

        :param token: An API key for a public dashboard.
        :>json array widgets: An array of arrays of :ref:`public widgets <public-widget-label>`, corresponding to the rows and columns the widgets are displayed in
        """
        if not isinstance(self.current_user, models.ApiUser):
            api_key = get_object_or_404(models.ApiKey.get_by_api_key, token)
            dashboard = api_key.object
        else:
            dashboard = self.current_user.object

        return serializers.public_dashboard(dashboard)


class DashboardShareResource(BaseResource):
    def post(self, dashboard_id):
        """
        Allow anonymous access to a dashboard.

        :param dashboard_id: The numeric ID of the dashboard to share.
        :>json string public_url: The URL for anonymous access to the dashboard.
        :>json api_key: The API key to use when accessing it.
        """
        dashboard = models.Dashboard.get_by_id_and_org(dashboard_id, self.current_org)
        require_admin_or_owner(dashboard.user_id)
        api_key = models.ApiKey.create_for_object(dashboard, self.current_user)
        models.db.session.flush()
        models.db.session.commit()

        public_url = url_for(
            "redash.public_dashboard",
            token=api_key.api_key,
            org_slug=self.current_org.slug,
            _external=True,
        )

        self.record_event(
            {
                "action": "activate_api_key",
                "object_id": dashboard.id,
                "object_type": "dashboard",
            }
        )

        return {"public_url": public_url, "api_key": api_key.api_key}

    def delete(self, dashboard_id):
        """
        Disable anonymous access to a dashboard.

        :param dashboard_id: The numeric ID of the dashboard to unshare.
        """
        dashboard = models.Dashboard.get_by_id_and_org(dashboard_id, self.current_org)
        require_admin_or_owner(dashboard.user_id)
        api_key = models.ApiKey.get_by_object(dashboard)

        if api_key:
            api_key.active = False
            models.db.session.add(api_key)
            models.db.session.commit()

        self.record_event(
            {
                "action": "deactivate_api_key",
                "object_id": dashboard.id,
                "object_type": "dashboard",
            }
        )


class DashboardTagsResource(BaseResource):
    @require_permission("list_dashboards")
    def get(self):
        """
        Lists all accessible dashboards.
        """
        tags = models.Dashboard.all_tags(self.current_org, self.current_user)
        return {"tags": [{"name": name, "count": count} for name, count in tags]}


class DashboardFavoriteListResource(BaseResource):
    def get(self):
        search_term = request.args.get("q")

        if search_term:
            base_query = models.Dashboard.search(
                self.current_org,
                self.current_user.group_ids,
                self.current_user.id,
                search_term,
            )
            favorites = models.Dashboard.favorites(
                self.current_user, base_query=base_query
            )
        else:
            favorites = models.Dashboard.favorites(self.current_user)

        favorites = filter_by_tags(favorites, models.Dashboard.tags)

        # order results according to passed order parameter,
        # special-casing search queries where the database
        # provides an order by search rank
        favorites = order_results(favorites, fallback=not bool(search_term))

        page = request.args.get("page", 1, type=int)
        page_size = request.args.get("page_size", 25, type=int)
        response = paginate(favorites, page, page_size, serialize_dashboard)

        self.record_event(
            {
                "action": "load_favorites",
                "object_type": "dashboard",
                "params": {
                    "q": search_term,
                    "tags": request.args.getlist("tags"),
                    "page": page,
                },
            }
        )

        return response
