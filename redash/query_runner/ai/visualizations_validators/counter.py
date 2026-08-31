from pydantic import BaseModel, Field


class CounterVisualization(BaseModel):
    counterLabel: str = Field(..., description="The label for the counter visualization.")
    counterColName: str = Field(
        ...,
        description="The name of the column to be used for the counter visualization.",
    )
    countRow: bool = Field(
        False,
        description="Whether to count the number of rows in the data. If set to True, the counter will display the total number of rows.",
    )
    targetColName: str = Field(
        "",
        description="The name of the column to be used for the target value in the counter visualization. Must be provided unless countRow is set to True.",
    )

    def to_dict(self):
        return {
            "counterLabel": self.counterLabel,
            "counterColName": self.counterColName,
            "countRow": self.countRow,
            "targetColName": self.targetColName,
            "rowNumber": 1,
            "targetRowNumber": 1,
            "stringDecimal": 0,
            "stringDecChar": ".",
            "stringThouSep": ",",
            "tooltipFormat": "0,0.000",
        }
