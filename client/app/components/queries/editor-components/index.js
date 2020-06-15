import SchemaBrowser from "@/components/queries/SchemaBrowser";
import QueryEditor from "@/components/queries/QueryEditor";

import { registerEditorComponent, getEditorComponents, QueryEditorComponents } from "./editorComponents";

// default query editor components
registerEditorComponent(QueryEditorComponents.SCHEMA_BROWSER, SchemaBrowser);
registerEditorComponent(QueryEditorComponents.QUERY_EDITOR, QueryEditor);

export { getEditorComponents };
