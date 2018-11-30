from flask import request
from redash import models
from redash.permissions import require_access, view_only
from redash.handlers.base import BaseResource, get_object_or_404, filter_by_tags, paginate
from redash.handlers.queries import order_results
from redash.serializers import QuerySerializer, serialize_dashboard

from sqlalchemy.exc import IntegrityError


class QueryFavoriteListResource(BaseResource):
    def get(self):
        search_term = request.args.get('q')

        if search_term:
            base_query = models.Query.search(search_term, self.current_user.group_ids, include_drafts=True, limit=None)
            favorites = models.Query.favorites(self.current_user, base_query=base_query)
        else:
            favorites = models.Query.favorites(self.current_user)

        favorites = filter_by_tags(favorites, models.Query.tags)

        # order results according to passed order parameter,
        # special-casing search queries where the database
        # provides an order by search rank
        ordered_favorites = order_results(favorites, fallback=bool(search_term))

        page = request.args.get('page', 1, type=int)
        page_size = request.args.get('page_size', 25, type=int)
        response = paginate(
            ordered_favorites,
            page,
            page_size,
            QuerySerializer,
            with_stats=True,
            with_last_modified_by=False,
        )

        self.record_event({
            'action': 'load_favorites',
            'object_type': 'query',
            'params': {
                'q': search_term,
                'tags': request.args.getlist('tags'),
                'page': page
            }
        })

        return response


class QueryFavoriteResource(BaseResource):
    def post(self, query_id):
        query = get_object_or_404(models.Query.get_by_id_and_org, query_id, self.current_org)
        require_access(query.groups, self.current_user, view_only)

        fav = models.Favorite(org_id=self.current_org.id, object=query, user=self.current_user)
        models.db.session.add(fav)

        try:
            models.db.session.commit()
        except IntegrityError as e:
            if 'unique_favorite' in e.message:
                models.db.session.rollback()
            else:
                raise e

        self.record_event({
            'action': 'favorite',
            'object_id': query.id,
            'object_type': 'query'
        })

    def delete(self, query_id):
        query = get_object_or_404(models.Query.get_by_id_and_org, query_id, self.current_org)
        require_access(query.groups, self.current_user, view_only)

        models.Favorite.query.filter(
            models.Favorite.object_id == query_id,
            models.Favorite.object_type == u'Query',
            models.Favorite.user==self.current_user,
        ).delete()
        models.db.session.commit()

        self.record_event({
            'action': 'favorite',
            'object_id': query.id,
            'object_type': 'query'
        })


class DashboardFavoriteListResource(BaseResource):
    def get(self):
        search_term = request.args.get('q')

        if search_term:
            base_query = models.Dashboard.search(self.current_org, self.current_user.group_ids, self.current_user.id, search_term)
            favorites = models.Dashboard.favorites(self.current_user, base_query=base_query)
        else:
            favorites = models.Dashboard.favorites(self.current_user)

        favorites = filter_by_tags(favorites, models.Dashboard.tags)

        page = request.args.get('page', 1, type=int)
        page_size = request.args.get('page_size', 25, type=int)
        response = paginate(favorites, page, page_size, serialize_dashboard)

        self.record_event({
            'action': 'load_favorites',
            'object_type': 'dashboard',
            'params': {
                'q': search_term,
                'tags': request.args.getlist('tags'),
                'page': page
            }
        })

        return response


class DashboardFavoriteResource(BaseResource):
    def post(self, object_id):
        dashboard = get_object_or_404(models.Dashboard.get_by_slug_and_org, object_id, self.current_org)
        fav = models.Favorite(org_id=self.current_org.id, object=dashboard, user=self.current_user)
        models.db.session.add(fav)

        try:
            models.db.session.commit()
        except IntegrityError as e:
            if 'unique_favorite' in e.message:
                models.db.session.rollback()
            else:
                raise e

        self.record_event({
            'action': 'favorite',
            'object_id': dashboard.id,
            'object_type': 'dashboard'
        })

    def delete(self, object_id):
        dashboard = get_object_or_404(models.Dashboard.get_by_slug_and_org, object_id, self.current_org)
        models.Favorite.query.filter(models.Favorite.object==dashboard, models.Favorite.user==self.current_user).delete()
        models.db.session.commit()
        self.record_event({
            'action': 'unfavorite',
            'object_id': dashboard.id,
            'object_type': 'dashboard'
        })
