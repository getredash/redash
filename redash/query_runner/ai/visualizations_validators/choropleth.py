from enum import Enum

from pydantic import BaseModel, Field


class CountryFieldFormat(Enum):
    ABBREV = "abbrev"
    ISO_A2 = "iso_a2"
    ISO_A3 = "iso_a3"
    ISO_N3 = "iso_n3"
    NAME = "name"
    NAME_LONG = "name_long"


class ChoroplethVisualization(BaseModel):
    keyColumn: str = Field(
        ...,
        description="The name of the column to be used for the key in the choropleth visualization. This column should contain country codes or names.",
    )
    targetField: CountryFieldFormat = Field(
        ...,
        description="The target field for the choropleth visualization. This field should contain the country codes or names that correspond to the key column.",
    )
    valueColumn: str = Field(
        ...,
        description="The name of the column to be used for the value in the choropleth visualization. This column should contain numerical values that will be used to color the countries on the map.",
    )

    def to_dict(self):
        return {
            "mapType": "countries",
            "keyColumn": self.keyColumn,
            "targetField": self.targetField.value,
            "valueColumn": self.valueColumn,
            "clusteringMode": "e",
            "steps": 5,
            "valueFormat": "0,0.00",
            "noValuePlaceholder": "N/A",
            "colors": {
                "min": "#799CFF",
                "max": "#002FB4",
                "background": "#ffffff",
                "borders": "#ffffff",
                "noValue": "#dddddd",
            },
            "legend": {"visible": True, "position": "bottom-left", "alignText": "right"},
            "tooltip": {"enabled": True, "template": "<b>{{ @@name }}</b>: {{ @@value }}"},
            "popup": {
                "enabled": True,
                "template": "Country: <b>{{ @@name_long }} ({{ @@iso_a2 }})</b>\n<br>\nValue: <b>{{ @@value }}</b>",
            },
        }
