from flask import request
from funcy import project

from redash import models
from redash.handlers.base import (
    BaseResource,
    get_object_or_404,
    require_fields,
)
from redash.permissions import require_admin_or_owner


class QuerySnippetResource(BaseResource):
    def get(self, snippet_id):
        snippet = get_object_or_404(models.QuerySnippet.get_by_id_and_org, snippet_id, self.current_org)

        self.record_event({"action": "view", "object_id": snippet_id, "object_type": "query_snippet"})

        return snippet.to_dict()

    def post(self, snippet_id):
        req = request.get_json(True)
        params = project(req, ("trigger", "description", "snippet"))
        snippet = get_object_or_404(models.QuerySnippet.get_by_id_and_org, snippet_id, self.current_org)
        require_admin_or_owner(snippet.user.id)

        self.update_model(snippet, params)
        models.db.session.commit()

        self.record_event({"action": "edit", "object_id": snippet.id, "object_type": "query_snippet"})
        return snippet.to_dict()

    def delete(self, snippet_id):
        snippet = get_object_or_404(models.QuerySnippet.get_by_id_and_org, snippet_id, self.current_org)
        require_admin_or_owner(snippet.user.id)
        models.db.session.delete(snippet)
        models.db.session.commit()

        self.record_event(
            {
                "action": "delete",
                "object_id": snippet.id,
                "object_type": "query_snippet",
            }
        )


class QuerySnippetListResource(BaseResource):
    def post(self):
        req = request.get_json(True)
        require_fields(req, ("trigger", "description", "snippet"))

        snippet = models.QuerySnippet(
            trigger=req["trigger"],
            description=req["description"],
            snippet=req["snippet"],
            user=self.current_user,
            org=self.current_org,
        )

        models.db.session.add(snippet)
        models.db.session.commit()

        self.record_event(
            {
                "action": "create",
                "object_id": snippet.id,
                "object_type": "query_snippet",
            }
        )

        return snippet.to_dict()

    def get(self):
        self.record_event({"action": "list", "object_type": "query_snippet"})
        return [snippet.to_dict() for snippet in models.QuerySnippet.all(org=self.current_org)]
