from mock import MagicMock, patch

from redash import models
from redash.tasks.google_directory import sync_google_directory_users
from tests import BaseTestCase


class FakeListRequest:
    def __init__(self, pages):
        self.pages = pages
        self.page = 0

    def execute(self):
        return self.pages[self.page]


def directory_service(pages_by_domain):
    """Builds a fake Directory API client returning the given pages of users per domain."""

    def list_next(request, response):
        request.page += 1
        return request if request.page < len(request.pages) else None

    service = MagicMock()
    service.users.return_value.list.side_effect = lambda domain, **kwargs: FakeListRequest(pages_by_domain[domain])
    service.users.return_value.list_next.side_effect = list_next
    return service


class TestSyncGoogleDirectoryUsers(BaseTestCase):
    def setUp(self):
        super().setUp()
        self.factory.org.settings = {models.Organization.SETTING_GOOGLE_APPS_DOMAINS: ["example.com"]}
        models.db.session.commit()

    def sync(self, pages_by_domain):
        with patch(
            "redash.tasks.google_directory._directory_service",
            return_value=directory_service(pages_by_domain),
        ):
            return sync_google_directory_users()

    def test_disables_users_missing_suspended_or_archived_in_directory(self):
        active = self.factory.create_user(email="active@example.com")
        alias = self.factory.create_user(email="alias@example.com")
        suspended = self.factory.create_user(email="suspended@example.com")
        archived = self.factory.create_user(email="archived@example.com")
        deleted = self.factory.create_user(email="deleted@example.com")
        subscription_id = self.factory.create_alert_subscription(user=deleted, destination=None).id

        self.sync(
            {
                "example.com": [
                    {
                        "users": [
                            {"primaryEmail": self.factory.user.email},
                            {"primaryEmail": "Active@example.com"},
                            {"primaryEmail": "suspended@example.com", "suspended": True},
                        ],
                        "nextPageToken": "next",
                    },
                    {
                        "users": [
                            {"primaryEmail": "primary@example.com", "aliases": ["alias@example.com"]},
                            {"primaryEmail": "archived@example.com", "archived": True},
                        ]
                    },
                ]
            }
        )

        self.assertFalse(models.User.query.get(active.id).is_disabled)
        self.assertFalse(models.User.query.get(alias.id).is_disabled)
        self.assertTrue(models.User.query.get(suspended.id).is_disabled)
        self.assertTrue(models.User.query.get(archived.id).is_disabled)
        self.assertTrue(models.User.query.get(deleted.id).is_disabled)
        self.assertIsNone(models.AlertSubscription.query.get(subscription_id))

    def test_ignores_users_outside_google_apps_domains(self):
        outside = self.factory.create_user(email="someone@other.com")

        self.sync({"example.com": [{"users": [{"primaryEmail": self.factory.user.email}]}]})

        self.assertFalse(models.User.query.get(outside.id).is_disabled)

    def test_skips_domain_when_directory_returns_no_users(self):
        user = self.factory.create_user(email="someone@example.com")

        self.sync({"example.com": [{"users": []}]})

        self.assertFalse(models.User.query.get(user.id).is_disabled)

    @patch("redash.settings.GOOGLE_DIRECTORY_SYNC_MAX_DISABLE", 1)
    def test_disables_nobody_when_over_the_limit(self):
        first = self.factory.create_user(email="first@example.com")
        second = self.factory.create_user(email="second@example.com")

        result = self.sync({"example.com": [{"users": [{"primaryEmail": self.factory.user.email}]}]})

        self.assertEqual(result["skipped"], 2)
        self.assertFalse(models.User.query.get(first.id).is_disabled)
        self.assertFalse(models.User.query.get(second.id).is_disabled)
