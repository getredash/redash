from io import BytesIO
from unittest import TestCase

import pandas as pd

from redash.query_runner.yandex_disk import EXTENSIONS_READERS

test_df = pd.DataFrame(
    [
        {"id": 1, "name": "Alice", "age": 20},
        {"id": 2, "name": "Bob", "age": 21},
        {"id": 3, "name": "Charlie", "age": 22},
        {"id": 4, "name": "Dave", "age": 23},
        {"id": 5, "name": "Eve", "age": 24},
    ]
)

test_token = "AAAAQAA"
test_path = "/filename.{format}"


class TestYandexDisk(TestCase):
    def test_xlsx(self):
        output = BytesIO()
        writer = pd.ExcelWriter(output)
        test_df.to_excel(writer, index=False)
        writer.save()

        is_equals = test_df.equals(EXTENSIONS_READERS["xlsx"](output))
        self.assertTrue(is_equals)

    def test_csv(self):
        output = BytesIO()
        test_df.to_csv(output, index=False)
        output.seek(0)

        is_equals = test_df.equals(EXTENSIONS_READERS["csv"](output))
        self.assertTrue(is_equals)

    def test_tsv(self):
        output = BytesIO()
        test_df.to_csv(output, index=False, sep="\t")
        output.seek(0)

        is_equals = test_df.equals(EXTENSIONS_READERS["tsv"](output))
        self.assertTrue(is_equals)
