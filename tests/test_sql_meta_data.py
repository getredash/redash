from redash.utils import SQLMetaData
from unittest import TestCase


class TestSQLMetaData(TestCase):
    def test_simple_select(self):
        metadata = SQLMetaData("SELECT t FROM test")
        self.assertEquals(metadata.used_tables, set(("test",)))
        self.assertFalse(metadata.has_ddl_statements)
        self.assertFalse(metadata.has_non_select_dml_statements)

    def test_multiple_select(self):
        metadata = SQLMetaData("SELECT t FROM test, test2 WHERE t > 1; SELECT a, b, c FROM testing as tbl")
        self.assertEquals(metadata.used_tables, set(("test", "test2", "testing")))
        self.assertFalse(metadata.has_ddl_statements)
        self.assertFalse(metadata.has_non_select_dml_statements)

    def test_detects_ddl(self):
        metadata = SQLMetaData("SELECT t FROM test; DROP TABLE test")
        self.assertEquals(metadata.used_tables, set(("test",)))
        self.assertTrue(metadata.has_ddl_statements)
        self.assertFalse(metadata.has_non_select_dml_statements)

    def test_detects_dml(self):
        metadata = SQLMetaData("SELECT t FROM test; DELETE * FROM test")
        self.assertEquals(metadata.used_tables, set(("test",)))
        self.assertFalse(metadata.has_ddl_statements)
        self.assertTrue(metadata.has_non_select_dml_statements)
