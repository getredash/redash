import React, { useEffect, useMemo, useState, useCallback, useImperativeHandle } from "react";
import cx from "classnames";
import { AceEditor, snippetsModule, updateSchemaCompleter } from "./ace";
import { SchemaItemType } from "@/components/queries/SchemaBrowser";
import resizeObserver from "@/services/resizeObserver";
import QuerySnippet from "@/services/query-snippet";
import QueryEditorControls from "./QueryEditorControls";
import "./index.less";
const editorProps = { $blockScrolling: Infinity };
type Props = {
    className?: string;
    syntax?: string;
    value?: string;
    autocompleteEnabled?: boolean;
    schema?: SchemaItemType[];
    onChange?: (...args: any[]) => any;
    onSelectionChange?: (...args: any[]) => any;
};
const QueryEditor = React.forwardRef<any, Props>(function ({ className, syntax, value, autocompleteEnabled, schema, onChange, onSelectionChange, ...props }, ref) {
    const [container, setContainer] = useState(null);
    const [editorRef, setEditorRef] = useState(null);
    // For some reason, value for AceEditor should be managed in this way - otherwise it goes berserk when selecting text
    const [currentValue, setCurrentValue] = useState(value);
    useEffect(() => {
        setCurrentValue(value);
    }, [value]);
    const handleChange = useCallback(str => {
        setCurrentValue(str);
        // @ts-expect-error ts-migrate(2722) FIXME: Cannot invoke an object which is possibly 'undefin... Remove this comment to see the full error message
        onChange(str);
    }, [onChange]);
    const editorOptions = useMemo(() => ({
        behavioursEnabled: true,
        enableSnippets: true,
        enableBasicAutocompletion: true,
        enableLiveAutocompletion: autocompleteEnabled,
        autoScrollEditorIntoView: true,
    }), [autocompleteEnabled]);
    useEffect(() => {
        if (editorRef) {
            // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
            const editorId = editorRef.editor.id;
            // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'SchemaItemType[] | undefined' is... Remove this comment to see the full error message
            updateSchemaCompleter(editorId, schema);
            return () => {
                updateSchemaCompleter(editorId, null);
            };
        }
    }, [schema, editorRef]);
    useEffect(() => {
        function resize() {
            if (editorRef) {
                // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
                editorRef.editor.resize();
            }
        }
        if (container) {
            resize();
            const unwatch = resizeObserver(container, resize);
            return unwatch;
        }
    }, [container, editorRef]);
    const handleSelectionChange = useCallback(selection => {
        // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
        const rawSelectedQueryText = editorRef.editor.session.doc.getTextRange(selection.getRange());
        const selectedQueryText = rawSelectedQueryText.length > 1 ? rawSelectedQueryText : null;
        // @ts-expect-error ts-migrate(2722) FIXME: Cannot invoke an object which is possibly 'undefin... Remove this comment to see the full error message
        onSelectionChange(selectedQueryText);
    }, [editorRef, onSelectionChange]);
    const initEditor = useCallback(editor => {
        // Release Cmd/Ctrl+L to the browser
        editor.commands.bindKey({ win: "Ctrl+L", mac: "Cmd+L" }, null);
        // Release Cmd/Ctrl+Shift+F for format query action
        editor.commands.bindKey({ win: "Ctrl+Shift+F", mac: "Cmd+Shift+F" }, null);
        // Release Ctrl+P for open new parameter dialog
        editor.commands.bindKey({ win: "Ctrl+P", mac: null }, null);
        // Lineup only mac
        editor.commands.bindKey({ win: null, mac: "Ctrl+P" }, "golineup");
        // Reset Completer in case dot is pressed
        editor.commands.on("afterExec", (e: any) => {
            if (e.command.name === "insertstring" && e.args === "." && editor.completer) {
                editor.completer.showPopup(editor);
            }
        });
        QuerySnippet.query().then(snippets => {
            const snippetManager = snippetsModule.snippetManager;
            const m = {
                snippetText: "",
            };
            (m as any).snippets = snippetManager.parseSnippetFile(m.snippetText);
            snippets.forEach(snippet => {
                (m as any).snippets.push(snippet.getSnippet());
            });
            snippetManager.register((m as any).snippets || [], (m as any).scope);
        });
        editor.focus();
    }, []);
    useImperativeHandle(ref, () => ({
        paste: (text: any) => {
            if (editorRef) {
                // @ts-expect-error ts-migrate(2339) FIXME: Property 'editor' does not exist on type 'null'.
                const { editor } = editorRef;
                editor.session.doc.replace(editor.selection.getRange(), text);
                const range = editor.selection.getRange();
                // @ts-expect-error ts-migrate(2722) FIXME: Cannot invoke an object which is possibly 'undefin... Remove this comment to see the full error message
                onChange(editor.session.getValue());
                editor.selection.setRange(range);
            }
        },
        focus: () => {
            if (editorRef) {
                // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
                editorRef.editor.focus();
            }
        },
    }), [editorRef, onChange]);
    // @ts-expect-error ts-migrate(2322) FIXME: Type 'Dispatch<SetStateAction<null>>' is not assig... Remove this comment to see the full error message
    return (<div className={cx("query-editor-container", className)} {...props} ref={setContainer}>
      {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'Dispatch<SetStateAction<null>>' is not assig... Remove this comment to see the full error message */}
      <AceEditor ref={setEditorRef} theme="textmate" mode={syntax || "sql"} value={currentValue} editorProps={editorProps} width="100%" height="100%" setOptions={editorOptions} showPrintMargin={false} wrapEnabled={false} onLoad={initEditor} onChange={handleChange} onSelectionChange={handleSelectionChange}/>
    </div>);
});
QueryEditor.defaultProps = {
    // @ts-expect-error ts-migrate(2322) FIXME: Type 'null' is not assignable to type 'string | un... Remove this comment to see the full error message
    className: null,
    // @ts-expect-error ts-migrate(2322) FIXME: Type 'null' is not assignable to type 'string | un... Remove this comment to see the full error message
    syntax: null,
    // @ts-expect-error ts-migrate(2322) FIXME: Type 'null' is not assignable to type 'string | un... Remove this comment to see the full error message
    value: null,
    autocompleteEnabled: true,
    schema: [],
    onChange: () => { },
    onSelectionChange: () => { },
};
(QueryEditor as any).Controls = QueryEditorControls;
export default QueryEditor;
