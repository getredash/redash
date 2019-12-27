import { extend } from "lodash";
import { Query } from "@/services/query";
import notification from "@/services/notification";

export default function formatQuery(query, syntax) {
  return Query.format(syntax || "sql", query.query)
    .then(queryText => extend(query.clone(), { query: queryText }))
    .catch(error => notification.error(error));
}
