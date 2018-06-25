from flask import request
from redash import models
from redash.permissions import require_access, view_only
from redash.handlers.base import BaseResource, get_object_or_404, filter_by_tags, paginate
from redash.serializers import QuerySerializer, serialize_dashboard


class QueryFavoriteListResource(BaseResource):
    def get(self):
        return QuerySerializer(models.Query.favorites(self.current_user)).serialize()

    
class QueryFavoriteResource(BaseResource):
    def post(self, query_id):
        query = get_object_or_404(models.Query.get_by_id_and_org, query_id, self.current_org)
        require_access(query.groups, self.current_user, view_only)

        fav = models.Favorite(org_id=self.current_org.id, object=query, user=self.current_user)
        models.db.session.add(fav)
        models.db.session.commit()
    
    def delete(self, query_id):
        query = get_object_or_404(models.Query.get_by_id_and_org, query_id, self.current_org)
        require_access(query.groups, self.current_user, view_only)

        models.Favorite.query.filter(models.Favorite.object==query, models.Favorite.user==self.current_user).delete()
        models.db.session.commit()


class DashboardFavoriteListResource(BaseResource):
    def get(self):
        search_term = request.args.get('q')

        if search_term:
            results = models.Dashboard.search(self.current_org, self.current_user.group_ids, self.current_user.id, search_term)
        else:
            favorites = models.Favorite.query.filter(models.Favorite.object.is_type(models.Dashboard)).filter(models.Favorite.user==self.current_user)

        favorites = filter_by_tags(favorites, models.Dashboard.tags)

        page = request.args.get('page', 1, type=int)
        page_size = request.args.get('page_size', 25, type=int)
        response = paginate(favorites, page, page_size, lambda fav: serialize_dashboard(fav.object))

        return response

    
class DashboardFavoriteResource(BaseResource):
    def post(self, object_id):
        dashboard = get_object_or_404(models.Dashboard.get_by_slug_and_org, object_id, self.current_org)
        fav = models.Favorite(org_id=self.current_org.id, object=dashboard, user=self.current_user)
        models.db.session.add(fav)
        models.db.session.commit()
    
    def delete(self, object_id):
        dashboard = get_object_or_404(models.Dashboard.get_by_slug_and_org, object_id, self.current_org)
        models.Favorite.query.filter(models.Favorite.object==dashboard, models.Favorite.user==self.current_user).delete()
        models.db.session.commit()