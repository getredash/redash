from redash.handlers.base import BaseResource
from redash import models
from redash.serializers import QuerySerializer


class QueryFavoriteListResource(BaseResource):
    def get(self):
        favorites = models.Favorite.query.filter(models.Favorite.object.is_type(models.Query)).filter(models.Favorite.user_id==self.current_user.id)
        return QuerySerializer([fav.object for fav in favorites]).serialize()

    
class QueryFavoriteResource(BaseResource):
    def post(self, query_id):
        # check access to the given query
        query = models.Query.get_by_id(query_id)
        fav = models.Favorite(object=query, user=self.current_user)
        models.db.session.add(fav)
        models.db.session.commit()
    
    def delete(self, query_id):
        # get_by_id_and_org
        query = models.Query.get_by_id(query_id)
        models.Favorite.query.filter(models.Favorite.object==query, models.Favorite.user==self.current_user).delete()
        models.db.session.commit()


class DashboardFavoriteListResource(BaseResource):
    def get(self):
        favorites = models.Favorite.query.filter(models.Favorite.object.is_type(models.Dashboard)).filter(models.Favorite.user==self.current_user)
        return [fav.object.to_dict() for fav in favorites]

    
class DashboardFavoriteResource(BaseResource):
    def post(self, object_id):
        # check access to the given query
        dashboard = models.Dashboard.get_by_slug_and_org(object_id, self.current_org)
        fav = models.Favorite(object=dashboard, user=self.current_user)
        models.db.session.add(fav)
        models.db.session.commit()
    
    def delete(self, object_id):
        dashboard = models.Dashboard.get_by_slug_and_org(object_id, self.current_org)
        models.Favorite.query.filter(models.Favorite.object==dashboard, models.Favorite.user==self.current_user).delete()
        models.db.session.commit()