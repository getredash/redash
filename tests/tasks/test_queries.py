from redash import redis_connection
from redash.tasks.queries import QueryTaskTracker
from unittest import TestCase


class TestPrune(TestCase):
    def setUp(self):
        self.list = "test_list"
        redis_connection.delete(self.list)
        for score in range(0, 100):
            redis_connection.zadd(self.list, score, 'k:{}'.format(score))

    def test_does_nothing_when_below_threshold(self):
        remove_count = QueryTaskTracker.prune(self.list, 100)
        self.assertEqual(remove_count, 0)
        self.assertEqual(redis_connection.zcard(self.list), 100)

    def test_removes_oldest_items_first(self):
        remove_count = QueryTaskTracker.prune(self.list, 50)
        self.assertEqual(remove_count, 50)
        self.assertEqual(redis_connection.zcard(self.list), 50)

        self.assertEqual(redis_connection.zscore(self.list, 'k:99'), 99.0)
        self.assertIsNone(redis_connection.zscore(self.list, 'k:1'))
