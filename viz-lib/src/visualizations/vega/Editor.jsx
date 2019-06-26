import React from "react";
import { Form, Select, Icon } from "antd";
import { debounce } from "lodash";
import AceEditor from "react-ace";
import { UndoManager, EditSession } from "ace-builds";

// Initialize editor configuration (language support, etc.)
import { initAce } from "@@/visualizations/vega/ace";

import { EditorPropTypes } from "@@/visualizations/prop-types";
import { Mode, THEMES, THEME_NAMES, DEFAULT_OPTIONS } from "./consts";
import { renderInitialSpecText } from "./helpers";

function createModel(initialValue, lang, uri) {
  const model = new EditSession(initialValue, `ace/mode/${lang}`);
  model.setTabSize(2);
  model.setUndoManager(new UndoManager());
  model.setUseWrapMode(true);
  model.setUseWorker(true);
  model.setUseSoftTabs(true);
  model.uri = uri;
  return model;
}

const ONCHANGE_TIMEOUT = 700;

export default class VegaEditor extends React.Component {
  static propTypes = EditorPropTypes;

  constructor(props) {
    super(props);
    this.editor = null; // reference to the editor instance.
    this.state = { ...props.options };
    this.buffers = {}; // Editor model buffer based on lang & mode
    this.updateSpec = this.updateSpec.bind(this);
    this.updateLang = this.updateLang.bind(this);
    this.updateTheme = this.updateTheme.bind(this);
    this.updateEditorBuffer = this.updateEditorBuffer.bind(this);
    this.editorDidMount = this.editorDidMount.bind(this);
    this.componentWillUnmount = this.componentWillUnmount.bind(this);
  }

  componentWillUnmount() {
    this.buffers = {};
    // Object.values(this.buffers).forEach(buf => buf.model.dispose());
  }

  getEditorBuffer(targetState) {
    const { spec, lang, mode, theme } = { ...this.state, ...targetState };
    const { lang: origLang, mode: origMode } = this.state;
    const uri = `internal://server/${mode}.${lang}`;
    const bufs = this.buffers;
    const buf = bufs[uri];
    let model = buf && buf.model;

    // always update editor value to latest spec text
    const { error, specText } = renderInitialSpecText(
      {
        spec,
        lang,
        mode,
        theme,
        origLang,
        origMode,
      },
      this.props
    );
    if (!model) {
      model = createModel(specText, lang, uri);
    } else if (!error && specText) {
      // ignore errors, and update text if needed
      model.setValue(specText);
    }
    bufs[uri] = bufs[uri] || { model };
    return bufs[uri];
  }

  setOption(options, callback) {
    this.setState(options, (...args) => {
      // propagage the update to parent (EditVisualizationDialog)
      this.props.onOptionsChange({ ...this.state });
      if (callback) {
        callback.apply(this, ...args);
      }
    });
  }

  updateLang(lang) {
    this.updateEditorBuffer({ lang });
  }

  updateMode(mode) {
    this.updateEditorBuffer({ mode });
  }

  updateSpec(spec) {
    // don't trigger onChange event is still pasting
    if (this.pasting) return;
    this.setOption({ spec });
  }

  updateTheme(theme) {
    this.setOption({ theme });
  }

  /**
   * Update editor buffer corresponds to the target lang & mode
   */
  updateEditorBuffer(targetState = {}) {
    if (!this.editor) return;
    const editor = this.editor;
    const newBuf = this.getEditorBuffer(targetState);
    const curModel = editor.getSession();

    if (curModel !== newBuf.model) {
      editor.setSession(newBuf.model);
    }
    // sync changed text to option
    targetState.spec = newBuf.model.getValue();
    this.setOption(targetState);
  }

  editorDidMount(editor) {
    this.editor = editor;
    this.updateEditorBuffer();
    initAce();
  }

  render() {
    const { lang, mode, spec, theme: _theme } = this.state;
    // make sure theme is acceptable value
    const theme = THEMES.includes(_theme) ? _theme : DEFAULT_OPTIONS.theme;

    return (
      <div className="vega-spec-editor">
        <Form.Item>
          <Select
            placeholder="Language"
            style={{ width: "6.5em" }}
            value={lang}
            onChange={target => this.updateLang(target)}>
            <Select.Option key="yaml"> YAML </Select.Option>
            <Select.Option key="json"> JSON </Select.Option>
          </Select>
          <Select placeholder="Mode" style={{ width: "8em" }} value={mode} onChange={target => this.updateMode(target)}>
            <Select.Option key={Mode.VegaLite}> Vega Lite </Select.Option>
            <Select.Option key={Mode.Vega}> Vega </Select.Option>
          </Select>
          <Select
            placeholder="Theme"
            style={{ width: "12.5em" }}
            defaultValue="custom"
            value={theme}
            onChange={target => this.updateTheme(target)}>
            {THEMES.map(value => (
              <Select.Option key={value}> {THEME_NAMES[value]} </Select.Option>
            ))}
          </Select>
          <a
            className="vega-help-link"
            href="https://vega.github.io/vega-lite/"
            target="_blank"
            rel="noopener noreferrer">
            <Icon type="question-circle" /> What is Vega?
          </a>
        </Form.Item>
        <AceEditor
          // maxium height without vertical scrollbar when form controls are
          // folded into three rows
          height="calc(100vh - 450px)"
          width="auto"
          theme="textmate"
          value={spec}
          mode={lang}
          setOptions={{
            mergeUndoDeltas: true,
            behavioursEnabled: true,
            wrapBehavioursEnabled: true,
            enableBasicAutocompletion: true,
            enableLiveAutocompletion: true,
            autoScrollEditorIntoView: false,
          }}
          editorProps={{ $blockScrolling: Infinity }}
          showPrintMargin={false}
          onChange={debounce(this.updateSpec, ONCHANGE_TIMEOUT)}
          onLoad={this.editorDidMount}
        />
      </div>
    );
  }
}
