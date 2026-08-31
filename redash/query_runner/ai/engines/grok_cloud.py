import logging

from groq import Groq

from redash.query_runner.ai.base_remote import AIBaseRemote

logger = logging.getLogger(__name__)


class AIGrokCloud(AIBaseRemote):
    @staticmethod
    def display_name():
        return "Grok (Cloud)"

    def __init__(self, query_runner, token=None, host=None, model_name=None, highlights=None):
        try:
            client = Groq(api_key=token)
        except Exception as e:
            logger.error(f"Failed to initialize Grok client: {e}")
            client = None
        finally:
            token = None  # Prevent token from being stored in memory after initialization

        super(AIGrokCloud, self).__init__(
            client=client,
            query_runner=query_runner,
            model_name=model_name or "openai/gpt-oss-20b",
            highlights=highlights,
        )

    def chat(self, messages: list[dict[str, str]]) -> str:
        if not self.client:
            logger.error("Grok client is not initialized.")
            return ""

        return (
            self.client.chat.completions.create(
                model=self.model_name,
                max_tokens=self.max_new_tokens,
                messages=messages,
            )
            .choices[0]
            .message.content
        )

    @property
    def models(self):
        if not self.client:
            logger.error("Grok client is not initialized.")
            return {}

        try:
            return {model.id: model.display_name for model in self.client.models.list().data}
        except Exception as e:
            logger.error(f"Failed to fetch models from Grok: {e}")
            return {}
