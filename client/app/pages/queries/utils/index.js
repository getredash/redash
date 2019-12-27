import updateQuery from "./updateQuery";
import archiveQuery from "./archiveQuery";
import duplicateQuery from "./duplicateQuery";
import formatQuery from "./formatQuery";
import deleteQueryVisualization from "./deleteQueryVisualization";
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

function updateQueryDescription(query, description) {
  recordEvent("edit_description", "query", query.id);
  return updateQuery(query, { description });
}

function updateQuerySchedule(query, schedule) {
  recordEvent("edit_schedule", "query", query.id);
  return updateQuery(query, { schedule });
}

export {
  updateQuery,
  archiveQuery,
  duplicateQuery,
  formatQuery,
  publishQuery,
  unpublishQuery,
  renameQuery,
  updateQueryDescription,
  updateQuerySchedule,
  deleteQueryVisualization,
};
