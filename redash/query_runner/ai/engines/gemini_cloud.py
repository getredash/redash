import logging

from google import genai

from redash.query_runner.ai.base_remote import AIBaseRemote

logger = logging.getLogger(__name__)


class AIGeminiCloud(AIBaseRemote):
    @staticmethod
    def display_name():
        return "Gemini (Cloud)"

    def __init__(self, query_runner, token=None, host=None, model_name=None, highlights=None):
        try:
            client = genai.Client(api_key=token)
        except Exception as e:
            logger.error(f"Failed to initialize Gemini client: {e}")
            client = None
        finally:
            token = None  # Prevent token from being stored in memory after initialization

        super(AIGeminiCloud, self).__init__(
            client=client,
            query_runner=query_runner,
            model_name=model_name or "gemini-3.7-flash",
            highlights=highlights,
        )

    def chat(self, messages: list[dict[str, str]]) -> str:
        return self.client.interactions.create(
            model=self.model_name,
            system_instruction=messages[0]["content"],
            input=messages[1]["content"],
            generation_config={"max_output_tokens": self.max_new_tokens},
        ).output_text

    @property
    def models(self):
        if not self.client:
            logger.error("Gemini client is not initialized.")
            return {}

        try:
            models = self.client.models.list(config={"page_size": 200})
        except Exception as e:
            logger.error(f"Failed to fetch models from Gemini: {e}")
            return {}

        logger.info("Fetching models from Gemini client: %s", models)

        return {model.base_model_id: model.display_name for model in models}
