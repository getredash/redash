import logging
from typing import Any

from redash.query_runner.ai.base import AIBase
from redash.query_runner.ai.engines.claude_cloud import AIClaudeCloud
from redash.query_runner.ai.engines.deepseek_cloud import AIDeepSeekCloud
from redash.query_runner.ai.engines.gemini_cloud import AIGeminiCloud
from redash.query_runner.ai.engines.grok_cloud import AIGrokCloud
from redash.query_runner.ai.engines.huggingface_local import AIHuggingFaceLocal
from redash.query_runner.ai.engines.ollama_remote import AIOllamaRemote
from redash.query_runner.ai.engines.openai_cloud import AIOpenAICloud
from redash.query_runner.ai.engines.openrouter_cloud import AIOpenRouterCloud

logger = logging.getLogger(__name__)


class AI(AIBase):
    """
    AI class that serves as a wrapper for different AI implementations.
    It initializes the appropriate AI implementation based on the organization settings.
    """

    instance_types = {
        "huggingface-local": AIHuggingFaceLocal,
        "huggingface-remote": None,
        "ollama-remote": AIOllamaRemote,
        "kimi-k3-remote": None,
        "deepseek-cloud": AIDeepSeekCloud,
        "openai-cloud": AIOpenAICloud,
        "claude-cloud": AIClaudeCloud,
        "claude-gemini": AIGeminiCloud,
        "grok-cloud": AIGrokCloud,
        "openrouter-cloud": AIOpenRouterCloud,
    }

    def __init__(self, query_runner=None, ai_type=None, ai_host=None, ai_token=None):
        if query_runner:
            self.type = ai_type or query_runner.configuration.get("ai_type") or "huggingface-local"

            logger.info(
                f"Initializing AI instance of type '{self.type}' for query runner '{query_runner.__class__.__name__}'; host='{query_runner.configuration.get('ai_host')}', token='{query_runner.configuration.get('ai_token')}'."
            )

            if self.instance_types.get(self.type):
                model_name = query_runner.configuration.get("ai_model") if not ai_type else None
                host = ai_host or query_runner.configuration.get("ai_host")
                token = ai_token or query_runner.configuration.get("ai_token")
                self.instance = self.instance_types[self.type](
                    query_runner,
                    token=token,
                    host=host,
                    model_name=model_name,
                    highlights=query_runner.configuration.get("ai_highlights"),
                )
                token = None  # Prevent token from being stored in memory after initialization
                ai_token = None  # Prevent token from being stored in memory after initialization
            else:
                raise NotImplementedError(f"AI type '{self.type}' is not implemented.")
        else:
            self.instance = None

    def apply_ai_query(self, query_text: str) -> str:
        if self.instance:
            return self.instance.apply_ai_query(query_text)
        return query_text

    def prompt(
        self,
        validation_class: Any,
        prompt: str,
        system_message: str,
        examples: list[str] = None,
    ) -> str:
        if self.instance:
            return self.instance.prompt(validation_class, prompt, system_message, examples)
        raise NotImplementedError(f"AI type '{self.type}' does not support prompt generation.")

    @property
    def models(self):
        if self.instance:
            return self.instance.models
        return {}

    @property
    def supported_types(self) -> dict[str, dict[str, Any]]:
        return {
            model_type: {
                "name": (
                    instance.display_name()
                    if instance
                    else (
                        model_type.replace("-", " ")
                        .title()
                        .replace("Cloud", "(Cloud)")
                        .replace("Local", "(Local)")
                        .replace("Remote", "(Remote)")
                        + " [Coming soon]"
                    )
                ),
                "enabled": bool(instance),
            }
            for model_type, instance in self.instance_types.items()
        }
