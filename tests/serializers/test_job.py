from unittest.mock import MagicMock

from rq.job import JobStatus
from rq.results import Result

from redash.serializers import (
    serialize_job,
)
from redash.tasks.queries.execution import QueryExecutionError
from tests import BaseTestCase


class JobSerializationTest(BaseTestCase):
    def test_serializes_job_with_exception_in_result(self):
        job = MagicMock()
        job.id = 0
        job.is_started = False
        job.get_status = MagicMock(return_value=JobStatus.FINISHED)
        result = MagicMock()
        result.type = Result.Type.SUCCESSFUL
        result.return_value = QueryExecutionError("test")
        job.latest_result = MagicMock(return_value=result)
        result = serialize_job(job)
        self.assertDictEqual(
            result,
            {
                "job": {
                    "id": 0,
                    "updated_at": 0,
                    "status": JobStatus.FAILED,
                    "error": str(QueryExecutionError("test")),
                    "result_id": None,
                }
            },
        )

    def test_serializes_job_with_dict_that_contains_error_in_result(self):
        job = MagicMock()
        job.id = 0
        job.is_started = False
        job.get_status = MagicMock(return_value=JobStatus.FINISHED)
        result = MagicMock()
        result.type = Result.Type.SUCCESSFUL
        result.return_value = {"error": "test error"}
        job.latest_result = MagicMock(return_value=result)
        result = serialize_job(job)
        self.assertDictEqual(
            result,
            {
                "job": {
                    "id": 0,
                    "updated_at": 0,
                    "status": JobStatus.FAILED,
                    "error": "test error",
                    "result_id": None,
                }
            },
        )

    def test_serializes_job_with_dict_that_finished_successfully(self):
        job = MagicMock()
        job.id = 0
        job.is_started = False
        job.get_status = MagicMock(return_value=JobStatus.FINISHED)
        result = MagicMock()
        result.type = Result.Type.SUCCESSFUL
        result.return_value = 1
        job.latest_result = MagicMock(return_value=result)
        result = serialize_job(job)
        self.assertDictEqual(
            result,
            {
                "job": {
                    "id": 0,
                    "updated_at": 0,
                    "status": JobStatus.FINISHED,
                    "error": None,
                    "result_id": 1,
                }
            },
        )
