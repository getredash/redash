from redash import models
from redash.permissions import require_access, view_only
from redash.handlers.base import BaseResource, get_object_or_404
from redash.serializers import QuerySerializer, serialize_dashboard


class QueryFavoriteListResource(BaseResource):
    def get(self):
        return QuerySerializer(models.Query.favorites(self.current_user)).serialize()

    
class QueryFavoriteResource(BaseResource):
    def post(self, query_id):
        query = get_object_or_404(models.Query.get_by_id_and_org, query_id, self.current_org)
        require_access(query.groups, self.current_user, view_only)

        fav = models.Favorite(object=query, user=self.current_user)
        models.db.session.add(fav)
        models.db.session.commit()
    
    def delete(self, query_id):
        query = get_object_or_404(models.Query.get_by_id_and_org, query_id, self.current_org)
        require_access(query.groups, self.current_user, view_only)

        models.Favorite.query.filter(models.Favorite.object==query, models.Favorite.user==self.current_user).delete()
        models.db.session.commit()


class DashboardFavoriteListResource(BaseResource):
    def get(self):
        favorites = models.Favorite.query.filter(models.Favorite.object.is_type(models.Dashboard)).filter(models.Favorite.user==self.current_user)
        return [serialize_dashboard(fav.object) for fav in favorites]

    
class DashboardFavoriteResource(BaseResource):
    def post(self, object_id):
        dashboard = get_object_or_404(models.Dashboard.get_by_slug_and_org, object_id, self.current_org)
        fav = models.Favorite(object=dashboard, user=self.current_user)
        models.db.session.add(fav)
        models.db.session.commit()
    
    def delete(self, object_id):
        dashboard = get_object_or_404(models.Dashboard.get_by_slug_and_org, object_id, self.current_org)
        models.Favorite.query.filter(models.Favorite.object==dashboard, models.Favorite.user==self.current_user).delete()
        models.db.session.commit()