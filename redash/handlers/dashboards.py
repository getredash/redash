from flask import request, url_for
from flask_restful import abort
from funcy import partial, project
from sqlalchemy.orm.exc import StaleDataError

from redash import models
from redash.handlers.base import (
    BaseResource,
    filter_by_tags,
    get_object_or_404,
    paginate,
)
from redash.handlers.base import order_results as _order_results
from redash.permissions import (
    can_modify,
    require_admin_or_owner,
    require_object_modify_permission,
    require_permission,
    ACCESS_TYPE_VIEW,
    ACCESS_TYPE_MODIFY,
)
from redash.security import csp_allows_embeding
from redash.serializers import DashboardSerializer, public_dashboard

# Ordering map for relationships
order_map = {
    "name": "lowercase_name",
    "-name": "-lowercase_name",
    "created_at": "created_at",
    "-created_at": "-created_at",
}

order_results = partial(_order_results, default_order="-created_at", allowed_orders=order_map)


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
            results = models.Dashboard.all(self.current_org, self.current_user.group_ids, self.current_user.id)

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
            serializer=DashboardSerializer,
        )

        if search_term:
            self.record_event({"action": "search", "object_type": "dashboard", "term": search_term})
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
            layout=[],
        )
        models.db.session.add(dashboard)
        models.db.session.commit()
        return DashboardSerializer(dashboard).serialize()


class MyDashboardsResource(BaseResource):
    @require_permission("list_dashboards")
    def get(self):
        """
        Retrieve a list of dashboards created by the current user.

        :qparam number page_size: Number of dashboards to return per page
        :qparam number page: Page number to retrieve
        :qparam number order: Name of column to order by
        :qparam number search: Full text search term

        Responds with an array of :ref:`dashboard <dashboard-response-label>`
        objects.
        """
        search_term = request.args.get("q", "")
        if search_term:
            results = models.Dashboard.search_by_user(search_term, self.current_user)
        else:
            results = models.Dashboard.by_user(self.current_user)

        results = filter_by_tags(results, models.Dashboard.tags)

        # order results according to passed order parameter,
        # special-casing search queries where the database
        # provides an order by search rank
        ordered_results = order_results(results, fallback=not bool(search_term))

        page = request.args.get("page", 1, type=int)
        page_size = request.args.get("page_size", 25, type=int)
        return paginate(ordered_results, page, page_size, DashboardSerializer)


class DashboardResource(BaseResource):
    @require_permission("list_dashboards")
    def get(self, dashboard_id=None):
        """
        Retrieves a dashboard.

        :qparam number id: Id of dashboard to retrieve.

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
        :>json object options: Dashboard options

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
        if request.args.get("legacy") is not None:
            fn = models.Dashboard.get_by_slug_and_org
        else:
            fn = models.Dashboard.get_by_id_and_org

        dashboard = get_object_or_404(fn, dashboard_id, self.current_org)

        # Determine if the current user should get a restricted view
        # This user should only have 'list_dashboards' and basic built-in group permissions.
        # They should not have 'edit_dashboard' or 'view_query'.
        is_dashboard_viewer = (
            self.current_user.has_permission("list_dashboards") and
            not self.current_user.has_permission("edit_dashboard") and
            not self.current_user.has_permission("view_query")
        )

        serializer = DashboardSerializer(
            dashboard,
            with_widgets=True,
            user=self.current_user, # Still needed for has_access checks in non-restricted path
            restricted_view=is_dashboard_viewer
        )
        response = serializer.serialize()

        if is_dashboard_viewer:
            response["can_edit"] = False
        else:
            # Original logic for can_edit for other users
            response["can_edit"] = can_modify(dashboard, self.current_user)

        # Public URL and API key info should likely be hidden for dashboard viewers,
        # as they are logged-in users, not anonymous users of a public link.
        # However, the original code shows this for all authenticated users.
        # For a strict "like public_dashboard" feel, these would be omitted for is_dashboard_viewer.
        # For now, let's keep original logic unless explicitly told to remove for this role.
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

        self.record_event({"action": "view", "object_id": dashboard.id, "object_type": "dashboard"})

        return response

    @require_permission("edit_dashboard")
    def post(self, dashboard_id):
        """
        Modifies a dashboard.

        :qparam number id: Id of dashboard to retrieve.

        Responds with the updated :ref:`dashboard <dashboard-response-label>`.

        :status 200: success
        :status 409: Version conflict -- dashboard modified since last read
        """
        dashboard_properties = request.get_json(force=True)
        # TODO: either convert all requests to use slugs or ids
        dashboard = models.Dashboard.get_by_id_and_org(dashboard_id, self.current_org)

        require_object_modify_permission(dashboard, self.current_user)

        updates = project(
            dashboard_properties,
            (
                "name",
                "layout",
                "version",
                "tags",
                "is_draft",
                "is_archived",
                "dashboard_filters_enabled",
                "options",
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

        result = DashboardSerializer(dashboard, with_widgets=True, user=self.current_user).serialize()

        self.record_event({"action": "edit", "object_id": dashboard.id, "object_type": "dashboard"})

        return result

    @require_permission("edit_dashboard")
    def delete(self, dashboard_id):
        """
        Archives a dashboard.

        :qparam number id: Id of dashboard to retrieve.

        Responds with the archived :ref:`dashboard <dashboard-response-label>`.
        """
        dashboard = models.Dashboard.get_by_id_and_org(dashboard_id, self.current_org)
        dashboard.is_archived = True
        dashboard.record_changes(changed_by=self.current_user)
        models.db.session.add(dashboard)
        d = DashboardSerializer(dashboard, with_widgets=True, user=self.current_user).serialize()
        models.db.session.commit()

        self.record_event({"action": "archive", "object_id": dashboard.id, "object_type": "dashboard"})

        return d


class PublicDashboardResource(BaseResource):
    decorators = BaseResource.decorators + [csp_allows_embeding]

    def get(self, token):
        """
        Retrieve a public dashboard.

        :param token: An API key for a public dashboard.
        :>json array widgets: An array of arrays of :ref:`public widgets <public-widget-label>`, corresponding to the rows and columns the widgets are displayed in
        """
        if self.current_org.get_setting("disable_public_urls"):
            abort(400, message="Public URLs are disabled.")

        if not isinstance(self.current_user, models.ApiUser):
            api_key = get_object_or_404(models.ApiKey.get_by_api_key, token)
            dashboard = api_key.object
        else:
            dashboard = self.current_user.object

        return public_dashboard(dashboard)


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
            favorites = models.Dashboard.favorites(self.current_user, base_query=base_query)
        else:
            favorites = models.Dashboard.favorites(self.current_user)

        favorites = filter_by_tags(favorites, models.Dashboard.tags)

        # order results according to passed order parameter,
        # special-casing search queries where the database
        # provides an order by search rank
        favorites = order_results(favorites, fallback=not bool(search_term))

        page = request.args.get("page", 1, type=int)
        page_size = request.args.get("page_size", 25, type=int)
        # TODO: we don't need to check for favorite status here
        response = paginate(favorites, page, page_size, DashboardSerializer)

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


class DashboardForkResource(BaseResource):
    @require_permission("edit_dashboard")
    def post(self, dashboard_id):
        dashboard = models.Dashboard.get_by_id_and_org(dashboard_id, self.current_org)

        fork_dashboard = dashboard.fork(self.current_user)
        models.db.session.commit()

        self.record_event({"action": "fork", "object_id": dashboard_id, "object_type": "dashboard"})

        return DashboardSerializer(fork_dashboard, with_widgets=True).serialize()


class DashboardGroupAccessResource(BaseResource):
    def post(self, dashboard_id, group_id):
        """
        Grants or updates a group's permission for a dashboard.
        """
        dashboard = get_object_or_404(models.Dashboard.get_by_id_and_org, dashboard_id, self.current_org)
        require_admin_or_owner(dashboard.user_id)

        group = get_object_or_404(models.Group.get_by_id_and_org, group_id, self.current_org)

        data = request.get_json(force=True)
        access_type = data.get("access_type")

        if access_type not in [ACCESS_TYPE_VIEW, ACCESS_TYPE_MODIFY]:
            abort(400, message="Invalid access_type. Must be 'view' or 'modify'.")

        if dashboard.group_access_permissions is None:
            dashboard.group_access_permissions = {}
        
        dashboard.group_access_permissions[str(group.id)] = access_type
        # Mark as modified for SQLAlchemy to pick up the change in MutableDict
        dashboard.group_access_permissions.changed()

        models.db.session.add(dashboard)
        models.db.session.commit()

        self.record_event({
            "action": "grant_dashboard_group_access",
            "object_id": dashboard.id,
            "object_type": "dashboard",
            "group_id": group.id,
            "access_type": access_type
        })

        return {"group_id": group.id, "access_type": access_type}

    def delete(self, dashboard_id, group_id):
        """
        Revokes a group's permission for a dashboard.
        """
        dashboard = get_object_or_404(models.Dashboard.get_by_id_and_org, dashboard_id, self.current_org)
        require_admin_or_owner(dashboard.user_id)

        # Validate group exists, though not strictly necessary for deletion if only group_id is used as key
        group = get_object_or_404(models.Group.get_by_id_and_org, group_id, self.current_org)

        if dashboard.group_access_permissions and str(group.id) in dashboard.group_access_permissions:
            del dashboard.group_access_permissions[str(group.id)]
            # Mark as modified
            dashboard.group_access_permissions.changed()
            
            models.db.session.add(dashboard)
            models.db.session.commit()

            self.record_event({
                "action": "revoke_dashboard_group_access",
                "object_id": dashboard.id,
                "object_type": "dashboard",
                "group_id": group.id
            })
            return {"status": "success"}
        else:
            abort(404, message="Group permission not found for this dashboard or dashboard has no group permissions set.")


class DashboardGroupPermissionListResource(BaseResource):
    def get(self, dashboard_id):
        """
        Lists group permissions for a specific dashboard.
        """
        dashboard = get_object_or_404(models.Dashboard.get_by_id_and_org, dashboard_id, self.current_org)
        require_admin_or_owner(dashboard.user_id)

        permissions_list = []
        if dashboard.group_access_permissions: # Check if dict is not None and not empty
            for group_id_str, access_type in dashboard.group_access_permissions.items():
                try:
                    group_id_int = int(group_id_str)
                    # Querying group by ID. Ensure group belongs to the same org for consistency,
                    # though group_access_permissions should ideally only store relevant group_ids.
                    # models.Group.get_by_id_and_org might be too restrictive if a group from another org was somehow added.
                    # For now, a simple .get() is fine, but consider implications if groups can be cross-org.
                    # The current Group model does have org_id, so filtering by current_org is safer.
                    group = models.Group.query.filter(models.Group.id == group_id_int, models.Group.org_id == self.current_org.id).first()

                    if group:
                        permissions_list.append({
                            "group_id": group.id,
                            "group_name": group.name,
                            "access_type": access_type
                        })
                    else:
                        # Optionally log that a group_id in permissions was not found or not in the current org
                        # logger.warning(f"Group ID {group_id_str} in dashboard {dashboard_id} permissions not found in org {self.current_org.id}")
                        pass
                except ValueError:
                    # Optionally log invalid group_id format
                    # logger.warning(f"Invalid group ID format '{group_id_str}' in dashboard {dashboard_id} permissions.")
                    pass
        
        return permissions_list
