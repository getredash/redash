from dataclasses import dataclass
from enum import Enum

from pydantic import BaseModel, Field


class Detailtype(Enum):
    BOOLEAN = "boolean"
    DATETIME = "datetime"
    IMAGE = "image"
    JSON = "json"
    LINK = "link"
    NUMBER = "number"
    STRING = "string"


class ColumnType(Enum):
    DATETIME = "datetime"
    FLOAT = "float"
    INTEGER = "integer"


@dataclass
class Detail:
    detail_type: Detailtype
    column_type: ColumnType
    column_name: str
    description: str | None = None


class DetailsVisualization(BaseModel):
    columns: list[Detail] = Field(
        ...,
        description='A list of column details for the visualization in the form of { "column_name": "column_name", "column_type": "column_type", "description": "column_description", "detail_type": "detail_type" }.',
    )

    def to_dict(self):
        return {
            "columns": [
                {
                    "nullValue": "null",
                    "booleanValues": ["false", "true"],
                    "imageUrlTemplate": "{{ @ }}",
                    "imageTitleTemplate": "{{ @ }}",
                    "imageWidth": "64" if col.column_type == ColumnType.IMAGE else "",
                    "imageHeight": "64" if col.column_type == ColumnType.IMAGE else "",
                    "linkUrlTemplate": "{{ @ }}",
                    "linkTextTemplate": "{{ @ }}",
                    "linkTitleTemplate": "{{ @ }}",
                    "linkOpenInNewTab": True,
                    "name": col.column_name,
                    "type": col.column_type.value,
                    "displayAs": col.detail_type.value,
                    "visible": True,
                    "order": 100000 + i,
                    "title": col.column_name.replace("_", " ").title(),
                    "alignContent": "left",
                    "description": col.description or col.column_name.replace("_", " ").title(),
                    "allowHTML": False,
                    "highlightLinks": False,
                    **(
                        {"dateFormat": "YYYY-MM-DD HH:mm:ss"}
                        if col.column_type == ColumnType.DATETIME
                        else (
                            ""
                            if col.column_type == ColumnType.STRING
                            else {"numberFormat": "0,0" if col.column_type == ColumnType.INTEGER else "0,0[.]00"}
                        )
                    ),
                }
                for i, col in enumerate(self.columns)
            ]
        }
