def clean_ai_schema(schema):
    options = schema.get("options", {})

    for key in ["ai_enabled", "ai_type", "ai_token", "ai_host", "ai_model", "ai_highlights"]:
        if key in options:
            del options[key]

    schema["options"] = options

    return schema
