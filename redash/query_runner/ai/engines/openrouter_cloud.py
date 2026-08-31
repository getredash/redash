import logging

from openrouter import OpenRouter, operations

from redash.query_runner.ai.base_remote import AIBaseRemote

logger = logging.getLogger(__name__)


class AIOpenRouterCloud(AIBaseRemote):
    @staticmethod
    def display_name():
        return "OpenRouter (Cloud)"

    def __init__(self, query_runner, token=None, host=None, model_name=None, highlights=None):
        try:
            self.token = token  # Store the token for later use in model listing
            client = OpenRouter(api_key=token)
        except Exception as e:
            logger.error(f"Failed to initialize OpenRouter client: {e}")
            client = None
        finally:
            token = None  # Prevent token from being stored in memory after initialization

        super(AIOpenRouterCloud, self).__init__(
            client=client,
            query_runner=query_runner,
            model_name=model_name,
            highlights=highlights,
        )

    def chat(self, messages: list[dict[str, str]]) -> str:
        if not self.client:
            logger.error("OpenRouter client is not initialized.")
            return ""

        return (
            self.client.chat.send(
                model=self.model_name, max_tokens=self.max_new_tokens, messages=messages, stream=False
            )
            .choices[0]
            .message.content
        )

    @property
    def models(self):
        if not self.client or not self.token:
            logger.error("OpenRouter client is not initialized.")
            return {}

        models = {}

        try:
            res = self.client.models.list_for_user(
                security=operations.ListModelsUserSecurity(bearer=self.token),
                # offset=0,
                # limit=500,
            )

            while res is not None:
                res = res.next()

                for model in res.data:
                    models[model.canonical_slug] = model.name

            return models
        except Exception as e:
            logger.error(f"Failed to fetch models from OpenRouter: {e}")
            return {}
