import logging

from ollama import Client

from redash.query_runner.ai.base_remote import AIBaseRemote

logger = logging.getLogger(__name__)


class AIOllamaRemote(AIBaseRemote):
    @staticmethod
    def display_name():
        return "Ollama (Remote)"

    def __init__(self, query_runner, token=None, host=None, model_name=None, highlights=None):
        headers = {}

        if token:
            headers["Authorization"] = f"Bearer {token}"
            token = None  # Prevent token from being stored in memory after initialization

        try:
            client = Client(host=host or "https://ollama.com", headers=headers)
        except Exception as e:
            logger.error(f"Failed to initialize Ollama client: {e}")
            client = None

        super(AIOllamaRemote, self).__init__(
            client=client,
            query_runner=query_runner,
            model_name=model_name or "gemma3",
            highlights=highlights,
        )
        headers = None  # Prevent token from being stored in memory after initialization

    def chat(self, messages: list[dict[str, str]]) -> str:
        return self.client.chat(
            model=self.model_name, messages=messages, options={"num_ctx": self.max_new_tokens}
        ).message.content

    @property
    def models(self):
        if not self.client:
            return {}

        try:
            return {
                model.model: model.model.title().replace(":", " ")
                for model in self.client.list().models
                if model.model
            }
        except Exception as e:
            logger.error(f"Failed to fetch models from Ollama: {e}")
            return {}
