from abc import ABC, abstractmethod


class HuggingFaceModelBase(ABC):
    def __init__(
        self,
        query_runner,
        model_name: str,
        token: str = None,
        max_new_tokens: int = 512,
        highlights: list = None,
    ):
        self.model_name = model_name
        self.token = token
        self.max_new_tokens = max_new_tokens
        self.query_runner = query_runner
        self.highlights = highlights

    @abstractmethod
    def load(self):
        pass

    @abstractmethod
    def generate(self, model, query_text: str) -> str:
        pass

    @property
    def models(self):
        return {self.model_name: self.model_name}

    def template(self, query_text: str) -> str:
        data_source_type = self.query_runner.__class__.__name__

        highlights = [
            f"If the whole message is already a valid {data_source_type} query, return it as is.",
            "If you cannot answer the question with the available database schema, return 'NO ANSWER'.",
            *(self.highlights if self.highlights else []),
        ]

        return f"""### Task
Generate a {data_source_type} query to answer [QUESTION]{query_text}[/QUESTION]

### Instructions
- {"\n- ".join(highlights)}

### Database Schema
The query will run on a database with the following schema:
{self.query_runner.get_schema()}

### Answer
Given the database schema, here is the {data_source_type} query that answers [QUESTION]{query_text}[/QUESTION]
[{data_source_type}]"""
