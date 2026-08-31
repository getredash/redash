from redash.query_runner.ai import AI


class ConfQueryRunner:
    def __init__(self):
        self.type = "conf"
        self.configuration = {}

    @property
    def supports_ai_query_type(self):
        return "conf"


def get_conf_query_runner(query_runner):
    if not query_runner or "local" in query_runner.ai.__class__.__name__.lower():
        return AI(ConfQueryRunner())
    else:
        return query_runner.ai
