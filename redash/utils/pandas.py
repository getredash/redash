import logging

import numpy as np
import pandas as pd

from redash.query_runner import (
    TYPE_BOOLEAN,
    TYPE_DATE,
    TYPE_DATETIME,
    TYPE_FLOAT,
    TYPE_INTEGER,
    TYPE_STRING,
)

logger = logging.getLogger(__name__)


def get_column_types_from_dataframe(df: pd.DataFrame) -> list:
    columns = []
    for column_name, column_type in df.dtypes.items():
        if column_type in (np.bool_, "bool"):
            redash_type = TYPE_BOOLEAN
        elif column_type in (np.int64, "int64", np.integer):
            redash_type = TYPE_INTEGER
        elif column_type in (np.inexact, np.floating, "float64"):
            redash_type = TYPE_FLOAT
        elif column_type in (np.datetime64, np.dtype("<M8[ns]")):
            if df.empty:
                redash_type = TYPE_DATETIME
            elif len(df[column_name].head(1).astype(str).loc[0]) > 10:
                redash_type = TYPE_DATETIME
            else:
                redash_type = TYPE_DATE
        else:
            redash_type = TYPE_STRING

        columns.append({"name": column_name, "friendly_name": column_name, "type": redash_type})

    return columns


def pandas_to_result(df: pd.DataFrame) -> dict:
    columns = get_column_types_from_dataframe(df)
    rows = df.to_dict("records")
    return {"columns": columns, "rows": rows}
