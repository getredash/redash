from redash.query_runner.ai.engines.huggingface_models import HuggingFaceModelBase
from redash.query_runner.ai.engines.huggingface_models.device import device


class HuggingFaceModelsQwenQwen3CoderNext(HuggingFaceModelBase):
    def __init__(self, query_runner, max_new_tokens=512, token=None, highlights=None):
        super(HuggingFaceModelsQwenQwen3CoderNext, self).__init__(
            query_runner, "Qwen/Qwen3-Coder-Next", token, max_new_tokens, highlights=highlights
        )
        self.model_data = None

    def load(self):
        from transformers import AutoModelForCausalLM, AutoTokenizer

        tokenizer = AutoTokenizer.from_pretrained(self.model_name, token=self.token or None)

        model = AutoModelForCausalLM.from_pretrained(
            self.model_name,
            token=self.token or None,
        ).to(device)
        self.token = None  # Prevent token from being stored in memory after initialization

        return {
            "model": model,
            "tokenizer": tokenizer,
            "pipe": None,
            "eos_token_id": None,
        }

    def generate(self, model, query_text: str) -> str:
        text = model["tokenizer"].apply_chat_template(
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful assistant that translates natural language questions into SQL queries. You are given a database schema and a question. Your task is to generate a valid SQL query that answers the question based on the provided schema. If you cannot answer the question with the available database schema, return 'NO ANSWER'. Do not include any explanations or additional text, only provide the SQL query or 'NO ANSWER'.",
                },
                {
                    "role": "user",
                    "content": self.template(query_text),
                },
            ],
            tokenize=False,
            add_generation_prompt=True,
        )
        model_inputs = model["tokenizer"]([text], return_tensors="pt").to(device)

        # conduct text completion
        generated_ids = model["model"].generate(**model_inputs, max_new_tokens=self.max_new_tokens)
        output_ids = generated_ids[0][len(model_inputs.input_ids[0]) :].tolist()

        return model["tokenizer"].decode(output_ids, skip_special_tokens=True)
