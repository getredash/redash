from pydantic import BaseModel, Field


class FunnelVisualization(BaseModel):
    sortKeyColName: str = Field(
        "date",
        description="The name of the column to use for sorting the funnel stages. Default is 'date'.",
    )
    sortKeyColReverse: bool = Field(
        True,
        description="Whether to sort the funnel stages in reverse order. Default is True.",
    )
    stepColName: str = Field(
        "step",
        description="The name of the column to use for the step values in the funnel visualization. Default is 'step'.",
    )
    stepColDisplayAs: str = Field(
        "Steps",
        description="The display name for the step column in the funnel visualization. Default is 'Steps'.",
    )
    valueColName: str = Field(
        "count",
        description="The name of the column to use for the value in the funnel visualization. Default is 'count'.",
    )
    valueColDisplayAs: str = Field(
        "Value",
        description="The display name for the value column in the funnel visualization. Default is 'Value'.",
    )

    def to_dict(self):
        return {
            "autoSort": False,
            "itemsLimit": 100,
            "numberFormat": "0,0[.]00",
            "percentFormat": "0[.]00%",
            "percentValuesRange": {
                "min": 0.01,
                "max": 1000,
            },
            "sortKeyCol": {
                "colName": self.sortKeyColName,
                "reverse": self.sortKeyColReverse,
            },
            "stepCol": {
                "colName": self.stepColName,
                "displayAs": self.stepColDisplayAs,
            },
            "valueCol": {
                "colName": self.valueColName,
                "displayAs": self.valueColDisplayAs,
            },
        }
