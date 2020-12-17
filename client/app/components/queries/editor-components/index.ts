import SchemaBrowser from "@/components/queries/SchemaBrowser";
import QueryEditor from "@/components/queries/QueryEditor";
import DatabricksSchemaBrowser from "./databricks/DatabricksSchemaBrowser";

import { registerEditorComponent, getEditorComponents, QueryEditorComponents } from "./editorComponents";

// default
// @ts-expect-error ts-migrate(2554) FIXME: Expected 3 arguments, but got 2.
registerEditorComponent(QueryEditorComponents.SCHEMA_BROWSER, SchemaBrowser);
// @ts-expect-error ts-migrate(2554) FIXME: Expected 3 arguments, but got 2.
registerEditorComponent(QueryEditorComponents.QUERY_EDITOR, QueryEditor);

// databricks
registerEditorComponent(QueryEditorComponents.SCHEMA_BROWSER, DatabricksSchemaBrowser, [
  "databricks",
  "databricks_internal",
]);

export { getEditorComponents };
