import updateQuery from "./updateQuery";
import archiveQuery from "./archiveQuery";
import duplicateQuery from "./duplicateQuery";
import { clientConfig } from "@/services/auth";
import recordEvent from "@/services/recordEvent";

function publishQuery(query) {
  recordEvent("toggle_published", "query", query.id);
  return updateQuery(query, { is_draft: false });
}

function unpublishQuery(query) {
  recordEvent("toggle_published", "query", query.id);
  return updateQuery(query, { is_draft: true });
}

function renameQuery(query, name) {
  recordEvent("edit_name", "query", query.id);
  const changes = { name };
  const options = {};

  if (query.is_draft && clientConfig.autoPublishNamedQueries && query.name !== "New Query") {
    changes.is_draft = false;
    options.successMessage = "Query saved and published";
  }

  return updateQuery(query, changes, options);
}

export { updateQuery, archiveQuery, duplicateQuery, publishQuery, unpublishQuery, renameQuery };
