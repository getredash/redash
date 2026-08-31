import logging

from deepseek import DeepSeekAPI

from redash.query_runner.ai.base_remote import AIBaseRemote

logger = logging.getLogger(__name__)


class AIDeepSeekCloud(AIBaseRemote):
    @staticmethod
    def display_name():
        return "DeepSeek (Cloud)"

    def __init__(self, query_runner, token=None, host=None, model_name=None, highlights=None):
        try:
            client = DeepSeekAPI(token)
        except Exception as e:
            logger.error(f"Failed to initialize DeepSeek client: {e}")
            client = None
        finally:
            token = None  # Prevent token from being stored in memory after initialization

        super(AIDeepSeekCloud, self).__init__(
            client=client,
            query_runner=query_runner,
            model_name=model_name or "deepseek-v4-flash",
            highlights=highlights,
        )

    def chat(self, messages: list[dict[str, str]]) -> str:
        if not self.client:
            logger.error("DeepSeek client is not initialized.")
            return ""

        return (
            self.client.chat_completion(
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
            logger.error("DeepSeek client is not initialized.")
            return {}

        try:
            return {model.id: model.id.replace("-", " ").title() for model in self.client.get_models()}
        except Exception as e:
            logger.error(f"Failed to fetch models from DeepSeek: {e}")
            return {}
