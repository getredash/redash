import { reduce } from "lodash";
import React, { useEffect, useMemo, useRef, useState, useCallback, useImperativeHandle } from "react";
import PropTypes from "prop-types";
import cx from "classnames";
import { AceEditor, snippetsModule, updateSchemaCompleter } from "./ace";
import resizeObserver from "@/services/resizeObserver";
import { QuerySnippet } from "@/services/query-snippet";

const editorProps = { $blockScrolling: Infinity };

const QueryEditorComponent = React.forwardRef(function(
  { className, syntax, value, autocompleteEnabled, schema, onChange, onSelectionChange, ...props },
  ref
) {
  const [container, setContainer] = useState(null);
  const editorRef = useRef(null);

  const editorOptions = useMemo(() => {
    const tokensCount = reduce(schema, (totalLength, table) => totalLength + table.columns.length, 0);
    return {
      behavioursEnabled: true,
      enableSnippets: true,
      enableBasicAutocompletion: true,
      enableLiveAutocompletion: autocompleteEnabled && tokensCount <= 5000,
      autoScrollEditorIntoView: true,
    };
  }, [autocompleteEnabled, schema]);

  useEffect(() => {
    if (editorRef.current) {
      const { editor } = editorRef.current;
      updateSchemaCompleter(editor.id, schema);
    }
  }, [schema]);

  useEffect(() => {
    if (container) {
      const unwatch = resizeObserver(container, () => {
        if (editorRef.current) {
          const { editor } = editorRef.current;
          editor.resize();
        }
      });
      return unwatch;
    }
  }, [container]);

  const handleSelectionChange = useCallback(
    selection => {
      const { editor } = editorRef.current;
      const doc = editor.getSession().doc;
      const rawSelectedQueryText = doc.getTextRange(selection.getRange());
      const selectedQueryText = rawSelectedQueryText.length > 1 ? rawSelectedQueryText : null;
      onSelectionChange(selectedQueryText);
    },
    [onSelectionChange]
  );

  const initEditor = useCallback(editor => {
    // Release Cmd/Ctrl+L to the browser
    editor.commands.bindKey("Cmd+L", null);
    editor.commands.bindKey("Ctrl+P", null);
    editor.commands.bindKey("Ctrl+L", null);

    // Ignore Ctrl+P to open new parameter dialog
    editor.commands.bindKey({ win: "Ctrl+P", mac: null }, null);
    // Lineup only mac
    editor.commands.bindKey({ win: null, mac: "Ctrl+P" }, "golineup");
    editor.commands.bindKey({ win: "Ctrl+Shift+F", mac: "Cmd+Shift+F" }, () => console.log("formatQuery"));

    // Reset Completer in case dot is pressed
    editor.commands.on("afterExec", e => {
      if (e.command.name === "insertstring" && e.args === "." && editor.completer) {
        editor.completer.showPopup(editor);
      }
    });

    QuerySnippet.query(snippets => {
      const snippetManager = snippetsModule.snippetManager;
      const m = {
        snippetText: "",
      };
      m.snippets = snippetManager.parseSnippetFile(m.snippetText);
      snippets.forEach(snippet => {
        m.snippets.push(snippet.getSnippet());
      });
      snippetManager.register(m.snippets || [], m.scope);
    });

    editor.focus();
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      paste: text => {
        if (editorRef.current) {
          const { editor } = editorRef.current;
          editor.session.doc.replace(editor.selection.getRange(), text);
          const range = editor.selection.getRange();
          onChange(editor.session.getValue());
          editor.selection.setRange(range);
        }
      },
      focus: () => {
        if (editorRef.current) {
          const { editor } = editorRef.current;
          editor.focus();
        }
      },
    }),
    [onChange]
  );

  return (
    <div className={cx("editor__container", className)} {...props} ref={setContainer}>
      <AceEditor
        ref={editorRef}
        theme="textmate"
        mode={syntax || "sql"}
        value={value}
        editorProps={editorProps}
        width="100%"
        height="100%"
        setOptions={editorOptions}
        showPrintMargin={false}
        wrapEnabled={false}
        onLoad={initEditor}
        onChange={onChange}
        onSelectionChange={handleSelectionChange}
      />
    </div>
  );
});

QueryEditorComponent.propTypes = {
  className: PropTypes.string,
  syntax: PropTypes.string,
  value: PropTypes.string,
  autocompleteEnabled: PropTypes.bool,
  schema: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      size: PropTypes.number,
      columns: PropTypes.arrayOf(PropTypes.string).isRequired,
    })
  ),
  onChange: PropTypes.func,
  onSelectionChange: PropTypes.func,
};

QueryEditorComponent.defaultProps = {
  className: null,
  syntax: null,
  value: null,
  autocompleteEnabled: true,
  schema: [],
  onChange: () => {},
  onSelectionChange: () => {},
};

export default QueryEditorComponent;
