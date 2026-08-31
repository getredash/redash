from abc import ABC, abstractmethod
from typing import Any


class AIBase(ABC):
    @abstractmethod
    def apply_ai_query(self, query_text: str) -> str:
        """
        Apply AI transformation to the query text. This is a placeholder method
        and should be implemented with actual AI logic in subclasses.
        """
        pass

    def prompt(
        self,
        validation_class: Any,
        prompt: str,
        system_message: str,
        examples: list[str] = None,
    ) -> str:
        """
        Generate a response from the AI model based on the provided prompt and system message.
        This is a placeholder method and should be implemented with actual AI logic in subclasses.
        """
        pass

    @abstractmethod
    def models(self):
        """
        Return a list of available models for the AI implementation.
        This is a placeholder method and should be implemented with actual AI logic in subclasses.
        """
        pass
