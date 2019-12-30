from unittest import TestCase
from mock import patch, ANY

from redash.tasks.schedule import rq_scheduler, schedule_periodic_jobs


class TestSchedule(TestCase):
    def setUp(self):
        for job in rq_scheduler.get_jobs():
            rq_scheduler.cancel(job)
            job.delete()

    def test_schedules_a_new_job(self):
        def foo():
            pass

        schedule_periodic_jobs([{"func": foo, "interval": 60}])

        jobs = [job for job in rq_scheduler.get_jobs()]

        self.assertEqual(len(jobs), 1)
        self.assertTrue(jobs[0].func_name.endswith("foo"))
        self.assertEqual(jobs[0].meta["interval"], 60)

    def test_doesnt_reschedule_an_existing_job(self):
        def foo():
            pass

        schedule_periodic_jobs([{"func": foo, "interval": 60}])
        with patch("redash.tasks.rq_scheduler.schedule") as schedule:
            schedule_periodic_jobs([{"func": foo, "interval": 60}])
            schedule.assert_not_called()

    def test_reschedules_a_modified_job(self):
        def foo():
            pass

        schedule_periodic_jobs([{"func": foo, "interval": 60}])
        schedule_periodic_jobs([{"func": foo, "interval": 120}])

        jobs = [job for job in rq_scheduler.get_jobs()]

        self.assertEqual(len(jobs), 1)
        self.assertTrue(jobs[0].func_name.endswith("foo"))
        self.assertEqual(jobs[0].meta["interval"], 120)

    def test_removes_jobs_that_are_no_longer_defined(self):
        def foo():
            pass

        def bar():
            pass

        schedule_periodic_jobs(
            [{"func": foo, "interval": 60}, {"func": bar, "interval": 90}]
        )
        schedule_periodic_jobs([{"func": foo, "interval": 60}])

        jobs = [job for job in rq_scheduler.get_jobs()]

        self.assertEqual(len(jobs), 1)
        self.assertTrue(jobs[0].func_name.endswith("foo"))
        self.assertEqual(jobs[0].meta["interval"], 60)

