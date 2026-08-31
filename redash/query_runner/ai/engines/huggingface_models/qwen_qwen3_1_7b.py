import logging

from outlines.inputs import Chat

from redash.query_runner.ai.engines.huggingface_models import HuggingFaceModelBase

logger = logging.getLogger(__name__)


class HuggingFaceModelsQwenQwen317B(HuggingFaceModelBase):
    def __init__(self, query_runner, max_new_tokens=128, token=None, highlights=None):
        super(HuggingFaceModelsQwenQwen317B, self).__init__(
            query_runner, "Qwen/Qwen3-1.7B", token, max_new_tokens, highlights=highlights
        )
        self.model_data = None

    def load(self):
        from transformers import AutoModelForCausalLM, AutoTokenizer

        tokenizer = AutoTokenizer.from_pretrained(self.model_name, token=self.token or None)

        model = AutoModelForCausalLM.from_pretrained(
            self.model_name,
            device_map="auto",
            token=self.token or None,
        )
        self.token = None  # Prevent token from being stored in memory after initialization

        return {
            "model": model,
            "tokenizer": tokenizer,
            "pipe": None,
            "eos_token_id": None,
        }

    def generate(self, model, query_text: str) -> str:
        text = model["tokenizer"].apply_chat_template(
            [
                {
                    "role": "system",
                    "content": "You are a helpful assistant. Do not include any explanations or additional text, only provide the clean answer to the user's question.",
                },
                {"role": "user", "content": query_text},
            ],
            tokenize=False,
            add_generation_prompt=True,
            enable_thinking=False,
        )

        inputs = model["tokenizer"](text, return_tensors="pt")
        response_ids = (
            model["model"]
            .generate(**inputs, max_new_tokens=self.max_new_tokens)[0][len(inputs.input_ids[0]) :]
            .tolist()
        )

        return model["tokenizer"].decode(response_ids, skip_special_tokens=True)

    def prompt(self, model, prompt: str, system_message: str, examples: list[str] = None) -> str:
        chat = Chat()
        chat.add_system_message(system_message)

        if examples:
            for example in examples:
                chat.add_user_message(example["user"])
                chat.add_assistant_message(example["assistant"])

        chat.add_user_message(prompt)

        res = model["generator"](chat, model["validation_class"], max_new_tokens=self.max_new_tokens)

        try:
            return model["validation_class"].model_validate_json(res).to_dict()
        except Exception as e:
            logger.error("Failed to parse response: %s", e)
            logger.error("Raw output was: %s", res)
            raise e
