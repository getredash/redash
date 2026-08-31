from pydantic import BaseModel, Field


class CohortVisualization(BaseModel):
    dateColumn: str = Field(..., description="The date column name for the cohort visualization.")
    stageColumn: str = Field(..., description="The stage column name for the cohort visualization.")
    totalColumn: str = Field(..., description="The total column name for the cohort visualization.")
    valueColumn: str = Field(..., description="The value column name for the cohort visualization.")

    def to_dict(self):
        return {
            "dateColumn": self.dateColumn,
            "stageColumn": self.stageColumn,
            "totalColumn": self.totalColumn,
            "valueColumn": self.valueColumn,
            "mode": "diagonal",
            "noValuePlaceholder": "-",
            "numberFormat": "0,0[.]00",
            "peopleColumnTitle": "Users",
            "percentFormat": "0.00%",
            "percentValues": True,
            "showTooltips": True,
            "stageColumnTitle": "{{ @ }}",
            "timeColumnTitle": "Time",
            "timeInterval": "daily",
        }
