from typing import get_args, get_origin

import openai
from openai.types import AllModels
from typing_extensions import Literal

from redash.query_runner.ai.base_remote import AIBaseRemote


class AIOpenAICloud(AIBaseRemote):
    @staticmethod
    def display_name():
        return "OpenAI (Cloud)"

    def __init__(self, query_runner, token=None, host=None, model_name=None, highlights=None):
        openai.api_key = token
        token = None  # Prevent token from being stored in memory after initialization

        super(AIOpenAICloud, self).__init__(
            client=openai,
            query_runner=query_runner,
            model_name=model_name or "gpt-5-mini",
            highlights=highlights,
        )

    def chat(self, messages: list[dict[str, str]]) -> str:
        return (
            openai.Completion.create(
                engine=self.model_name,
                max_tokens=self.max_new_tokens,
                prompt="\n".join([f"{m['role']}: {m['content']}" for m in messages]),
            )
            .choices[0]
            .text
        )

    @property
    def models(self):
        return {
            model: model.replace("-", " ").title()
            for arg in get_args(AllModels)
            if get_origin(arg) is Literal
            for model in get_args(arg)
        }
