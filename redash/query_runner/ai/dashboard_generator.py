import logging

from pydantic import BaseModel, Field

from redash import models
from redash.query_runner.ai.ai_conf_query_runner import get_conf_query_runner

logger = logging.getLogger(__name__)


class DashboardChoice(BaseModel):
    name: str = Field(..., description="The name of the chosen visualization.")
    description: str = Field(..., description="The description of the chosen visualization.")

    def to_dict(self):
        return {
            "name": self.name,
            "description": self.description,
        }


class DashboardChoices(BaseModel):
    choices: list[DashboardChoice] = Field(..., description="The list of the chosen visualizations.")

    def to_dict(self):
        return {
            "choices": [choice.to_dict() for choice in self.choices],
        }


class DashboardGenerator:
    def __init__(self, query_runner, dashboard):
        self.ai = get_conf_query_runner(query_runner)

        self.dashboard = dashboard

    def choose_widgets(self, visualizations) -> list[str]:
        """
        Choose appropriate widgets based on the provided visualizations.
        """

        options = [v.name for v in visualizations]

        choices = self.ai.prompt(
            DashboardChoices,
            f"The dashboard name is: {self.dashboard.name}\n\nHere are the visualizations: {', '.join(options)}",
            f"You are a helpful assistant that chooses appropriate widgets from the provided visualizations. Your task is to analyze the visualizations and choose the most suitable ones for the given dashboard. You must choose only the exact names from the given visualizations names list. For the chosen ones create a long description as part of the JSON according to the structure. Return the choices as a valid JSON object with the following structure: {DashboardChoices.model_json_schema()}. Do not include any explanations or additional text.",
            [
                {
                    "user": "The dashboard name is: User Dashboard\n\nHere are the visualizations: User Counter, Query Performance Chart, User Growth Chart, User Distribution Map, Queries Table",
                    "assistant": '{"choices": [{"name": "User Counter", "description": "The count of all the users in the system."}, {"name": "User Growth Chart", "description": "The growth of users over time."}, {"name": "User Distribution Map", "description": "The geographical distribution of users by country."}]}',
                },
            ],
        ).get("choices", [])

        logger.debug(f"AI suggested widgets: {choices}")

        for i, choice in enumerate(choices):
            if choice["name"] not in options:
                logger.warning(
                    f"AI suggested widget '{choice['name']}' is not in the available visualizations. Skipping."
                )
                continue

            choices[i]["visualization"] = visualizations[options.index(choice["name"])]

        return choices

    def get_widgets(self, visualizations) -> list:
        """
        Generate widgets based on the data.
        """

        max_widgets = 10
        widgets_to_create = self.choose_widgets(visualizations)
        widgets = []
        known_widget_names = set()
        col_step = 6
        row_step = 8
        details_row_step = 2
        col = 0
        row = 0

        for widget_obj in widgets_to_create:
            if len(widgets) == max_widgets:
                break

            if widget_obj["name"] in known_widget_names:
                logger.warning(f"Duplicate widget name '{widget_obj['name']}' detected. Skipping.")
                continue  # Skip if an widget with the same name already exists

            try:
                widgets.append(
                    {
                        "name": "",  # Widjets have no text.
                        "options": {
                            "isHidden": False,
                            "position": {
                                "autoHeight": False,
                                "sizeX": 6,
                                "sizeY": row_step,
                                "minSizeX": 2,
                                "maxSizeX": 12,
                                "minSizeY": 2,
                                "maxSizeY": 1000,
                                "col": col,
                                "row": row,
                            },
                        },
                        "width": 1,  # widget["options"]["sizeX"],
                        "visualization": widget_obj["visualization"],
                    }
                )

                # Add a Textbox for the description of the widget.
                widgets.append(
                    {
                        "name": widget_obj["description"],
                        "options": {
                            "isHidden": False,
                            "position": {
                                "autoHeight": False,
                                "sizeX": 6,
                                "sizeY": details_row_step,
                                "minSizeX": 2,
                                "maxSizeX": 12,
                                "minSizeY": 2,
                                "maxSizeY": 1000,
                                "col": col,
                                "row": row + row_step,
                            },
                        },
                        "width": 1,  # widget["options"]["sizeX"],
                        "visualization": None,
                    }
                )

                known_widget_names.add(widget_obj["name"])

                col = (col + col_step) % 12

                if not col:
                    row += row_step + details_row_step
            except Exception as e:
                logger.error(f"Failed to generate widget configuration for '{widget_obj['name']}': {e}")

        logger.debug(f"AI generated widgets: {widgets}")

        return widgets

    def get_dashboard(self) -> dict:
        """
        Generate a dashboard based on the data.
        """

        active_queries = models.Query.query.filter(models.Query.is_draft.is_(False)).all()

        visualizations = []
        for query in active_queries:
            visualizations.extend(query.visualizations)

        logger.debug(f"Active visualizations: {len(visualizations)}; active queries: {len(active_queries)}")

        widgets = self.get_widgets(visualizations)

        for widget in widgets:
            models.db.session.add(
                models.Widget(
                    dashboard_id=self.dashboard.id,
                    visualization_id=widget["visualization"].id if widget["visualization"] else None,
                    text=widget["name"],
                    options=widget["options"],
                    width=widget["width"],
                    visualization=widget["visualization"],
                )
            )

        if widgets:
            models.db.session.commit()
