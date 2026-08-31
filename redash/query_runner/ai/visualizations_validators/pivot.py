from pydantic import BaseModel, Field


class PivotVisualization(BaseModel):
    dummy: str = Field(..., description="The name of any column used for the pivot visualization.")

    def to_dict(self):
        return {"controls": {"enabled": False}, "rendererOptions": {"table": {"colTotals": True, "rowTotals": True}}}
