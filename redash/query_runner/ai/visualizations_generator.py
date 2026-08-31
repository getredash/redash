import logging
from enum import Enum, EnumType
from time import time

from pydantic import BaseModel, Field

from redash import models
from redash.query_runner.ai.ai_conf_query_runner import get_conf_query_runner
from redash.query_runner.ai.visualizations_validators.chart import ChartVisualization
from redash.query_runner.ai.visualizations_validators.choropleth import (
    ChoroplethVisualization,
)
from redash.query_runner.ai.visualizations_validators.cohort import CohortVisualization
from redash.query_runner.ai.visualizations_validators.counter import (
    CounterVisualization,
)
from redash.query_runner.ai.visualizations_validators.details import (
    DetailsVisualization,
)
from redash.query_runner.ai.visualizations_validators.funnel import FunnelVisualization
from redash.query_runner.ai.visualizations_validators.map import MapVisualization
from redash.query_runner.ai.visualizations_validators.pivot import PivotVisualization

logger = logging.getLogger(__name__)


class VisualizationInstanceType(Enum):
    __order__ = "CHART CHOROPLETH COHORT COUNTER DETAILS FUNNEL MAP PIVOT"
    CHART = ChartVisualization
    CHOROPLETH = ChoroplethVisualization
    COHORT = CohortVisualization
    COUNTER = CounterVisualization
    DETAILS = DetailsVisualization
    FUNNEL = FunnelVisualization
    MAP = MapVisualization
    PIVOT = PivotVisualization


VisualizationType: EnumType = Enum("VisualizationType", {v.name: v.name for v in VisualizationInstanceType})


class VisualizationChooser(BaseModel):
    visualization_types: list[VisualizationType] = Field(
        ...,
        description="A list of visualization types to be generated based on the data. The available visualization types are COUNTER and FUNNEL.",
    )

    def to_dict(self):
        return {
            "visualization_types": [v.value for v in self.visualization_types],
        }


class VisualizationTitles(BaseModel):
    name: str = Field(..., description="The name of the visualization.")
    description: str = Field(..., description="A brief description of the visualization.")

    def to_dict(self):
        return {
            "name": self.name,
            "description": self.description,
        }


class VisualizationsGenerator:
    def __init__(self, query_runner, data):
        self.ai = get_conf_query_runner(query_runner)

        self.data = str(
            {
                "columns": data.get("columns", []),
                "rows": data.get("rows", [])[:10],
            }
        )

        self.schemas = {v.value.__class__.__name__: v.value.model_json_schema() for v in VisualizationInstanceType}

    def choose_visualizations(self) -> list[str]:
        """
        Choose appropriate visualizations based on the data.
        """

        choices = self.ai.prompt(
            VisualizationChooser,
            f"Here is the data: {self.data}",
            f"You are a helpful assistant that suggests appropriate visualizations based on the provided data. Your task is to analyze the data and choose the most suitable visualizations from the given list, choose appropriate visualizations from the following list: {[v.name for v in VisualizationInstanceType]}. Return the choices as a valid JSON object with the following structure: {VisualizationChooser.model_json_schema()}. Take into account the structures of the validators in order to create visualizations with the correct number of minimum fields: {self.schemas}. Do not include any explanations or additional text.",
            [
                {
                    "user": "Here is the data: {'columns': [{'name': 'count', 'friendly_name': 'count', 'type': 'integer'}], 'rows': [{'count': 1}]}",
                    "assistant": '{"visualization_types": ["COUNTER"]}',
                },
            ],
        ).get("visualization_types", [])

        logger.debug(f"AI suggested visualizations: {choices}")

        return {choice: VisualizationInstanceType[choice].value for choice in choices}

    def get_visualization_titles(self, visualization) -> tuple[str, str]:
        """
        Generate titles and descriptions for visualizations based on the data.
        """

        titles = self.ai.prompt(
            VisualizationTitles,
            f"Given the following data: {self.data}, generate a title and description for a {visualization.lower()} visualization. ",
            f"You are a helpful assistant that generates titles and descriptions for visualizations based on the provided data. Your task is to analyze the data and generate a suitable title and description for the specified visualization type. Return the title and description as a valid JSON object with the following structure: {VisualizationTitles.model_json_schema()}. Do not include any explanations or additional text.",
            [
                {
                    "user": "Given the following data: {'columns': [{'name': 'count', 'friendly_name': 'count', 'type': 'integer'}], 'rows': [{'count': 1}]}, generate a title and description for a counter visualization.",
                    "assistant": '{"name": "User Counter", "description": "Counts the number of users."}',
                },
            ],
        )

        logger.debug(f"AI generated titles for {visualization}: {titles}")

        return (
            titles.get("name", f"AI generated {visualization} [{time()}]")[:100],
            titles.get("description", f"AI generated {visualization} visualization.")[:4096],
        )

    def get_visualization(self, visualization, visualization_class) -> models.Visualization:
        """
        Generate visualizations based on the data.
        """

        return self.ai.prompt(
            visualization_class,
            f"Given the following data: {self.data}, generate a {visualization} visualization.",
            f"You are a helpful assistant that generates visualizations based on the provided data. Your task is to analyze the data and generate a visualization of the specified type. Return the visualization as a valid JSON object with the following structure: {visualization_class.model_json_schema()}. Do not include any explanations or additional text.",
            [
                {
                    "user": "Given the following data: {'columns': [{'name': 'count', 'friendly_name': 'count', 'type': 'integer'}], 'rows': [{'count': 1}]}, generate a counter visualization.",
                    "assistant": '{"counterLabel": "User Count", "counterColName": "count", "countRow": false, "targetColName": "count"}',
                },
            ],
        )

    def get_visualizations(self) -> list:
        """
        Generate visualizations based on the data.
        """

        visualizations_to_create = self.choose_visualizations()
        visualizations = []
        known = set()

        for visualization, visualization_class in visualizations_to_create.items():
            if visualization in known:
                logger.warning(f"Duplicate visualization type '{visualization}' detected. Skipping.")
                continue

            title, description = self.get_visualization_titles(visualization)

            try:
                visualizations.append(
                    {
                        "name": title,
                        "description": description,
                        "type": visualization,
                        "options": self.get_visualization(visualization, visualization_class),
                    }
                )

                known.add(visualization)
            except Exception as e:
                logger.error(f"Failed to generate visualization configuration for '{visualization}': {e}")

        logger.debug(f"AI generated visualizations: {visualizations}")

        return visualizations
