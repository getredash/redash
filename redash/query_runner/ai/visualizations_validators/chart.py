from enum import Enum

from pydantic import BaseModel, Field

complements = {
    "area": {},
    "box": {},
    "bubble": {},
    "column": {},
    "heatmap": {},
    "line": {},
    "pie": {"showDataLabels": True},
    "scatter": {},
}


class ComplementaryChartType(Enum):
    area = "area"
    box = "box"
    bubble = "bubble"
    column = "column"
    heatmap = "heatmap"
    line = "line"
    pie = "pie"
    scatter = "scatter"


class ChartVisualization(BaseModel):
    chartType: ComplementaryChartType = Field(
        ..., description="The type of chart to be generated. The available chart types are column and line."
    )
    xAxis: str = Field(..., description="The name of the column to be used for the x-axis in the chart visualization.")
    yAxis: str = Field(..., description="The name of the column to be used for the y-axis in the chart visualization.")
    groupBy: str | None = Field(
        None,
        description="The name of the column to be used for grouping data points in the chart visualization, optional.",
    )
    errorColumn: str | None = Field(
        None, description="The name of the column to be used for error bars in the chart visualization, optional."
    )
    bubbleSize: str | None = Field(
        None,
        description="The name of the column to be used for bubble size in the chart visualization, optional. Only if the chart type is set to bubble.",
    )

    def to_dict(self):
        return {
            "globalSeriesType": self.chartType.name,
            "sortX": True,
            "legend": {"enabled": True, "placement": "auto", "traceorder": "normal"},
            "xAxis": {"type": "-", "labels": {"enabled": True}},
            "yAxis": [{"type": "linear"}, {"type": "linear", "opposite": True}],
            "alignYAxesAtZero": False,
            "error_y": {"type": "data", "visible": True},
            "series": {"stacking": None, "error_y": {"type": "data", "visible": True}},
            "seriesOptions": {},
            "valuesOptions": {},
            "columnMapping": {
                self.xAxis: "x",
                self.yAxis: "y",
                **({self.groupBy: "series"} if self.groupBy else {}),
                **({self.bubbleSize: "size"} if self.bubbleSize else {}),
                **({self.errorColumn: "error_y"} if self.errorColumn else {}),
            },
            "direction": {"type": "counterclockwise"},
            "sizemode": "diameter",
            "coefficient": 1,
            "piesort": True,
            "color_scheme": "Redash",
            "lineShape": "linear",
            "numberFormat": "0,0[.]00000",
            "percentFormat": "0[.]00%",
            "textFormat": "",
            "enableLink": False,
            "linkOpenNewTab": True,
            "linkFormat": "",
            "missingValuesAsZero": True,
            "showDataLabels": False,
            "dateTimeFormat": "DD/MM/YY HH:mm",
            "swappedAxes": False,
        }
