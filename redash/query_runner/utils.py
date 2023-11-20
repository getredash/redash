import numpy as np
import pandas as pd

from . import (
    TYPE_BOOLEAN,
    TYPE_DATE,
    TYPE_DATETIME,
    TYPE_FLOAT,
    TYPE_INTEGER,
    TYPE_STRING,
)

column_type_mappings = {
    np.bool_: TYPE_BOOLEAN,
    np.inexact: TYPE_FLOAT,
    np.integer: TYPE_INTEGER,
}


def get_column_types_from_dataframe(df: pd.DataFrame) -> list:
    columns = []

    for column_name, column_type in df.dtypes.items():
        if column_type in column_type_mappings:
            redash_type = column_type_mappings[column_type]
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
