import logging

from flask import jsonify, request
from flask_login import login_required

from redash import settings
from redash.handlers.base import org_scoped_rule, routes

logger = logging.getLogger(__name__)


@routes.route(org_scoped_rule("/api/ai/generate_query"), methods=["POST"])
@login_required
def ai_generate_query(org_slug=None):
    """
    Generates a query from a natural language description using an LLM.

    :<json string natural_language: Natural language description of the desired query
    :<json string dialect: Optional SQL dialect hint (default: sql)
    :<json array schema: Optional list of schema objects with ``name`` and ``columns`` keys
    :>json string query: The generated query text
    """
    if not settings.LLM_ENABLED:
        return jsonify({"message": "LLM integration is not configured."}), 501

    body = request.get_json(force=True)
    natural_language = (body.get("natural_language") or "").strip()

    if not natural_language:
        return jsonify({"message": "natural_language is required"}), 400

    dialect = body.get("dialect", "sql")
    schema = body.get("schema", [])

    try:
        query = _generate_query_with_llm(natural_language, dialect, schema)
        return jsonify({"query": query})
    except Exception:
        logger.exception("Error generating query with LLM")
        return jsonify({"message": "Failed to generate query. Please try again."}), 500


def _build_schema_text(schema):
    if not schema:
        return ""
    lines = []
    for table in schema:
        cols = ", ".join(table.get("columns", []))
        lines.append("  {}({})".format(table["name"], cols))
    return "\nDatabase schema:\n" + "\n".join(lines)


def _generate_query_with_llm(natural_language, dialect, schema):
    import requests as http_requests

    schema_text = _build_schema_text(schema)
    dialect_upper = dialect.upper()

    system_prompt = (
        "You are a helpful SQL expert. Generate a valid {dialect} query based on the user's request. "
        "Return only the query text with no explanation or markdown formatting."
    ).format(dialect=dialect_upper)

    user_message = "Generate a {dialect} query: {nl}{schema}".format(
        dialect=dialect_upper,
        nl=natural_language,
        schema=schema_text,
    )

    payload = {
        "model": settings.OPENAI_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        "temperature": 0,
    }

    headers = {
        "Authorization": "Bearer {}".format(settings.OPENAI_API_KEY),
        "Content-Type": "application/json",
    }

    response = http_requests.post(
        "{}/chat/completions".format(settings.OPENAI_BASE_URL),
        json=payload,
        headers=headers,
        timeout=60,
    )
    response.raise_for_status()

    data = response.json()
    return data["choices"][0]["message"]["content"].strip()
