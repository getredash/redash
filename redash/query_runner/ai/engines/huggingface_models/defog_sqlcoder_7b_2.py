from redash.query_runner.ai.engines.huggingface_models import HuggingFaceModelBase
from redash.query_runner.ai.engines.huggingface_models.device import device


class HuggingFaceModelsDefogSQLCoder7B2(HuggingFaceModelBase):
    def __init__(self, query_runner, max_new_tokens=300, token=None, highlights=None):
        super(HuggingFaceModelsDefogSQLCoder7B2, self).__init__(
            query_runner, "defog/sqlcoder-7b-2", token, max_new_tokens, highlights=highlights
        )
        self.model_data = None

    def load(self):
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline

        tokenizer = AutoTokenizer.from_pretrained(self.model_name, token=self.token or None)

        model = AutoModelForCausalLM.from_pretrained(
            self.model_name,
            trust_remote_code=True,
            dtype=torch.float16,
            use_cache=True,
            token=self.token or None,
        ).to(device)
        self.token = None  # Prevent token from being stored in memory after initialization

        pipe = pipeline(
            "text-generation",
            model=model,
            tokenizer=tokenizer,
            max_new_tokens=self.max_new_tokens,
            do_sample=False,
            return_full_text=False,  # added return_full_text parameter to prevent splitting issues with prompt
            num_beams=5,  # do beam search with 5 beams for high quality results
        )

        # make sure the model stops generating at triple ticks
        # eos_token_id = tokenizer.convert_tokens_to_ids(["```"])[0]
        eos_token_id = tokenizer.eos_token_id

        return {
            "model": model,
            "tokenizer": tokenizer,
            "pipe": pipe,
            "eos_token_id": eos_token_id,
        }

    def generate(self, model, query_text: str) -> str:
        return (
            model["pipe"](
                self.template(query_text),
                num_return_sequences=1,
                eos_token_id=model["eos_token_id"],
                pad_token_id=model["eos_token_id"],
            )[0]["generated_text"]
            .split(";")[0]
            .split("```")[0]
            .strip()
            + ";"
        )
