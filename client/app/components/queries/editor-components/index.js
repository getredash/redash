import SchemaBrowser from "@/components/queries/SchemaBrowser";
import QueryEditor from "@/components/queries/QueryEditor";

import { registerEditorComponent, useEditorComponents } from "./editorComponents"

// default query editor components
registerEditorComponent("SchemaBrowser", SchemaBrowser);
registerEditorComponent("QueryEditor", QueryEditor);

export { useEditorComponents };
