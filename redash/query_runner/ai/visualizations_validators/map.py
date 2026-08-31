from pydantic import BaseModel, Field


class MapVisualization(BaseModel):
    latColName: str = Field(
        ..., description="The name of the column containing latitude values for the map visualization."
    )
    lonColName: str = Field(
        ..., description="The name of the column containing longitude values for the map visualization."
    )
    groupBy: str | None = Field(
        None, description="The name of the column used for grouping data points on the map visualization, optional."
    )

    def to_dict(self):
        return {
            "latColName": self.latColName,
            "lonColName": self.lonColName,
            "classify": self.groupBy,
            "groups": {},
            "mapTileUrl": "//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            "clusterMarkers": True,
            "customizeMarkers": False,
            "iconShape": "marker",
            "iconFont": "circle",
            "foregroundColor": "#ffffff",
            "backgroundColor": "#356AFF",
            "borderColor": "#356AFF",
            "bounds": None,
            "tooltip": {"enabled": False, "template": ""},
            "popup": {"enabled": True, "template": ""},
        }
