import logging

from pydantic import BaseModel, Field

from redash.query_runner.ai.ai_conf_query_runner import get_conf_query_runner

logger = logging.getLogger(__name__)


class Highlights(BaseModel):
    highlights: list[str] = Field(..., description="The list of the highlights.")

    def to_dict(self):
        return {
            "highlights": self.highlights,
        }


class HighlightsGenerator:
    def __init__(self, query_runner):
        self.ai = get_conf_query_runner(query_runner)
        self.query_runner = query_runner

    def suggest_highlights(self, data: str) -> list[str]:
        """
        Suggest appropriate highlights based on the data.
        """

        highlights = self.ai.prompt(
            Highlights,
            f"Here is the data: {data}",
            f"You are a helpful assistant that suggests appropriate highlights based on the provided description of a {self.query_runner.__class__.__name__} data source. Your task is to analyze the data and summarize in your words only the most meaningful highlights, if any. Return the results as a valid JSON object with the following structure: {Highlights.model_json_schema()}. Do not include any explanations or additional text.",
            [
                {
                    "user": "Here is the data: This is a test database.",
                    "assistant": '{"highlights": []}',
                },
                {
                    "user": "Here is the data: This is a database for a flight booking system. In this database, we have tables for flights, passengers, bookings, and payments. The flights table contains information about flight schedules, destinations, and airlines. The passengers table stores details about the passengers, including their names, contact information, and frequent flyer numbers. The bookings table keeps track of which passengers have booked which flights, along with booking dates and statuses. The payments table records payment transactions for the bookings, including payment methods and amounts. On 22/8/2023 we transformed the users table and now all the old records have an empty created_at column.",
                    "assistant": '{"highlights": ["The focus is on flight booking.", "Records in the Users table have an empty created_at before 22/8/2023."]}',
                },
                {
                    "user": "Here is the data: This is a database for an e-commerce platform. In this database, we have tables for products, customers, orders, and payments. The products table contains information about the items available for sale, including their names, descriptions, prices, and stock levels. The customers table stores details about the users of the platform, such as their names, email addresses, and shipping addresses. The orders table keeps track of the purchases made by customers, including order dates, statuses, and associated products. The payments table records payment transactions for the orders, including payment methods and amounts. We got hacked on 22/8/2023 and all the old records in the customers table have modified passwords. We created another helper table called customers_pass_ver for verifying which users have modified passwords.",
                    "assistant": '{"highlights": ["The focus is on e-commerce.", "Records in the Customers table have modified passwords before 22/8/2023.", "The customers_pass_ver table was created logging which users have modified their passwords."]}',
                },
            ],
        ).get("highlights", [])

        logger.debug(f"AI suggested highlights: {highlights}")

        return highlights

    def get_highlights(self, data: str) -> list:
        """
        Generate highlights based on the data.
        """

        highlights = list(set(self.suggest_highlights(data)))

        logger.debug(f"AI generated highlights: {highlights}")

        return highlights
