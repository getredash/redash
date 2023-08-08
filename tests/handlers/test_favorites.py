from tests import BaseTestCase


class TestQueryFavoriteResource(BaseTestCase):
    def test_favorite(self):
        query = self.factory.create_query()

        rv = self.make_request("post", f"/api/queries/{query.id}/favorite")
        self.assertEqual(rv.status_code, 200)

        rv = self.make_request("get", f"/api/queries/{query.id}")
        self.assertEqual(rv.json["is_favorite"], True)

    def test_duplicate_favorite(self):
        query = self.factory.create_query()

        rv = self.make_request("post", f"/api/queries/{query.id}/favorite")
        self.assertEqual(rv.status_code, 200)

        rv = self.make_request("post", f"/api/queries/{query.id}/favorite")
        self.assertEqual(rv.status_code, 200)

    def test_unfavorite(self):
        query = self.factory.create_query()
        rv = self.make_request("post", f"/api/queries/{query.id}/favorite")
        rv = self.make_request("delete", f"/api/queries/{query.id}/favorite")
        self.assertEqual(rv.status_code, 200)

        rv = self.make_request("get", f"/api/queries/{query.id}")
        self.assertEqual(rv.json["is_favorite"], False)


class TestQueryFavoriteListResource(BaseTestCase):
    def test_get_favorites(self):
        rv = self.make_request("get", "/api/queries/favorites")
        self.assertEqual(rv.status_code, 200)
