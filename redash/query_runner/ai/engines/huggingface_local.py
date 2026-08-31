import logging
import traceback
from time import sleep
from typing import Any

import outlines

from redash.query_runner.ai.base import AIBase
from redash.query_runner.ai.engines.huggingface_models.defog_sqlcoder_7b_2 import (
    HuggingFaceModelsDefogSQLCoder7B2,
)
from redash.query_runner.ai.engines.huggingface_models.qwen_qwen3_1_7b import (
    HuggingFaceModelsQwenQwen317B,
)
from redash.query_runner.ai.engines.huggingface_models.qwen_qwen3_coder_next import (
    HuggingFaceModelsQwenQwen3CoderNext,
)

models = {}

logger = logging.getLogger(__name__)


class AIHuggingFaceLocal(AIBase):
    @staticmethod
    def display_name():
        return "HuggingFace (Local)"

    def __init__(self, query_runner, token=None, host=None, model_name=None, highlights=None):
        """
        NOTE: `host` parameter is not used in this class, but it's included for compatibility with other AI implementations that may require a host.
        """
        self.model_name = model_name
        self.query_runner = query_runner
        self.token = token
        self.highlights = highlights
        token = None  # Prevent token from being stored in memory after initialization

    @property
    def models(self):
        if models.get(self.query_runner.supports_ai_query_type, {}).get("loaded"):
            return models[self.query_runner.supports_ai_query_type]["model_instance"].models
        return {}

    def load_model(self):
        global models

        if not models.get(self.query_runner.supports_ai_query_type, {}).get("loaded"):
            if not models.get(self.query_runner.supports_ai_query_type):
                models[self.query_runner.supports_ai_query_type] = {"loading": True}

                if self.query_runner.supports_ai_query_type in ["sql", "sparql"]:
                    model_instance = HuggingFaceModelsDefogSQLCoder7B2(
                        self.query_runner, token=self.token, highlights=self.highlights
                    )
                elif self.query_runner.supports_ai_query_type == "nosql":
                    model_instance = HuggingFaceModelsQwenQwen3CoderNext(
                        self.query_runner, token=self.token, highlights=self.highlights
                    )
                elif self.query_runner.supports_ai_query_type == "conf":
                    model_instance = HuggingFaceModelsQwenQwen317B(
                        self.query_runner, token=self.token, highlights=self.highlights
                    )
                else:
                    raise NotImplementedError(
                        f"AI query type '{self.query_runner.supports_ai_query_type}' is not supported for HuggingFaceLocal."
                    )

                models[self.query_runner.supports_ai_query_type] = {
                    **model_instance.load(),
                    "model_instance": model_instance,
                    "loaded": True,
                }
            else:
                while models[self.query_runner.supports_ai_query_type].get("loading"):
                    sleep(1)

    def apply_ai_query(self, query_text: str) -> str:
        """
        Transform the query text using AI. This is a placeholder method and should be implemented
        with actual AI logic in subclasses.
        """

        self.load_model()

        query = models[self.query_runner.supports_ai_query_type]["model_instance"].generate(
            models[self.query_runner.supports_ai_query_type], query_text
        )

        return query

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

        self.load_model()

        # Copy the model's dict data to avoid modifying the global state.
        obj = dict(models[self.query_runner.supports_ai_query_type])

        if not getattr(obj["model_instance"], "prompt"):
            raise NotImplementedError(
                f"Prompt method is not implemented for AI query type '{self.query_runner.supports_ai_query_type}' in {self.__class__.__name__}."
            )

        obj["generator"] = outlines.from_transformers(obj["model"], obj["tokenizer"])
        obj["validation_class"] = validation_class
        trials = 3

        for trial in range(trials):
            try:
                response = obj["model_instance"].prompt(obj, prompt, system_message, examples)
                return response
            except Exception as e:
                logger.error("!! Failed to generate response after %d trials: %s", trial + 1, e)
                logger.error("!! Raw error was: %s", traceback.format_exc())

                if trial == trials - 1:
                    raise RuntimeError(f"Failed to generate response after {trial + 1} trials: {e}")
