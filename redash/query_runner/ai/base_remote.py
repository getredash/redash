import logging
from abc import ABC, abstractmethod
from re import DOTALL, sub
from typing import Any

from ollama import ChatResponse

from redash.query_runner.ai.base import AIBase

logger = logging.getLogger(__name__)


class AIBaseRemote(AIBase, ABC):
    def __init__(self, client, query_runner, model_name, highlights=None):
        """
        NOTE: `host` parameter is not used in this class, but it's included for compatibility with other AI implementations that may require a host.
        """
        self.model_name = model_name
        self.query_runner = query_runner
        self.client = client
        self.max_new_tokens = 512  # Default value
        self.highlights = highlights

    @property
    def engines(self):
        pass

    def load_model(self):
        pass

    @abstractmethod
    def chat(self, messages: list[dict[str, str]]) -> str:
        pass

    def _clean_response(self, response: str) -> str:
        """
        Clean the AI response by removing any code block formatting and extra whitespace.
        """

        if response:
            if "```" in response:
                # Remove code block formatting (```...```)
                cleaned_response = sub(r".*```(sql)?(.*)```.*", r"\2", response, flags=DOTALL)
                # Strip leading/trailing whitespace
                return cleaned_response.strip()

            return response.strip()

        return ""

    def apply_ai_query(self, query_text: str) -> str:
        """
        Transform the query text using AI. This is a placeholder method and should be implemented
        with actual AI logic in subclasses.
        """

        highlights = [
            f"If the whole message is already a valid {self.query_runner.__class__.__name__} query, return it as is.",
            "If you cannot answer the question with the available database schema, return 'NO ANSWER'.",
            *(self.highlights if self.highlights else []),
        ]

        query: ChatResponse = self.chat(
            [
                {
                    "role": "system",
                    "content": f"""### Task
Generate a {self.query_runner.__class__.__name__} query to answer [QUESTION]{query_text}[/QUESTION]

### Instructions
- {"\n- ".join(highlights)}

### Database Schema
The query will run on a database with the following schema:
{self.query_runner.get_schema()}""",
                },
                {
                    "role": "user",
                    "content": f"""Given the database schema, here is the {self.query_runner.__class__.__name__} query that answers [QUESTION]{query_text}[/QUESTION]
[{self.query_runner.__class__.__name__}]""",
                },
            ]
        )

        return self._clean_response(query) or "NO ANSWER"

    def prompt(
        self,
        validation_class: Any,
        prompt: str,
        system_message: str,
        examples: list[str] = None,
    ) -> str:
        """
        Generate a response from the AI model based on the provided prompt and system message.
        """

        if not self.client:
            logger.error("AI client is not initialized.")
            return ""

        messages = [{"role": "system", "content": system_message}]

        if examples:
            for example in examples:
                messages.append({"role": "user", "content": example["user"]})
                messages.append({"role": "assistant", "content": example["assistant"]})

        messages.append({"role": "user", "content": prompt})

        response: ChatResponse = self.chat(messages)

        trials = 3
        for trial in range(trials):
            try:
                return validation_class.model_validate_json(self._clean_response(response)).to_dict()
            except Exception as e:
                logger.error("!! Validation failed for AI response: '%s' ; error=%s", response, e)
                if trial == trials - 1:
                    raise ValueError(f"!! Validation failed for AI response: {e}")
