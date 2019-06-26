import stringify from "json-stringify-pretty-compact";
import ResizeObserver from "resize-observer-polyfill";
import { find, isObject, debounce } from "lodash";
import React from "react";
import { Vega } from "react-vega";
import * as vl from "vega-lite";
// import * as YAML from 'js-yaml';
import { Handler } from "vega-tooltip";
import { Alert, Icon } from "antd";
import LZString from "lz-string";
import memoize from "memoize-one";

import { RendererPropTypes } from "@@/visualizations/prop-types";
import { Mode, NAMES } from "./consts";
import { parseSpecText, yaml2json, applyTheme } from "./helpers";
import "./vega.less";

function getComputedDimension(elem) {
  const style = window.getComputedStyle(elem);
  const padding = {
    left: parseInt(style.getPropertyValue("padding-left"), 10) || 0,
    right: parseInt(style.getPropertyValue("padding-right"), 10) || 0,
    top: parseInt(style.getPropertyValue("padding-top"), 10) || 0,
    bottom: parseInt(style.getPropertyValue("padding-bottom"), 10) || 0,
  };
  return {
    padding,
  };
}

function hasOptionUpdates(prevOptions, options) {
  return (
    prevOptions.spec !== options.spec ||
    prevOptions.mode !== options.mode ||
    prevOptions.lang !== options.lang ||
    prevOptions.theme !== options.theme
  );
}

/**
 * Check whether an HTMLElement changes height because elem changes height
 */
function isFixedSizeParent(elem, parent) {
  const origElemDisplay = elem.style.display;
  const origParentHeight = parent.clientHeight;
  elem.style.display = 'none';
  const keptHeight = origParentHeight === parent.clientHeight;
  elem.style.display = origElemDisplay;
  return keptHeight;
}

/**
 * The the parent node that does not auto-expand when visualization changes sizes
 */
function getSizingParent(elem) {
  let parent = elem.parentNode;
  while (parent) {
    if (isFixedSizeParent(elem, parent)) return parent;
    parent = parent.parentNode;
  }
  // defaults to direct parent
  return elem.parentNode;
}

// only trigger rerender when parent container changed more than this size
const RESIZE_THRESHOLD = 10;
const MAX_WIDTH_IN_EDITOR = 800;
const MAX_HEIGHT_IN_EDITOR = 600;

export default class VegaRenderer extends React.PureComponent {
  static propTypes = RendererPropTypes;

  /**
   * Parse Vega spec in props based on chosen language and
   * vega mode (lite or not).
   *
   * Since we used memoization, this function must be an instance method
   *
   * @param {object} props properties passed from React
   */
  parseOptions = memoize(({ lang, mode, spec, theme }, compileLite = true) => {
    let error = null;
    const parsed = parseSpecText({ spec, lang, mode });
    error = parsed.error;
    spec = parsed.spec; // if error, spec will be default spec

    if (error) {
      return { error, mode, spec };
    }

    // Always apply the them in config
    applyTheme(spec, theme);

    // when either width or height is unset, enable autoresize
    const { width, height } = spec;
    const autoresize = !width || !height;

    // If source is VegaLite spec, convert to Vega
    if (compileLite && mode === Mode.VegaLite) {
      try {
        spec = vl.compile(spec).spec;
      } catch (err) {
        error = err.message;
      }
      // revert to origin height if we are doing autoresize
      // (Vega-Lite will set default size as 200x200)
      if (autoresize) {
        spec.width = width;
        spec.height = height;
      }
    }

    return { error, mode, spec, autoresize };
  });

  constructor(props) {
    super(props);
    this.state = {
      parentSize: null,
    };
  }

  componentDidMount() {
    const parentContainer = getSizingParent(this.elem);
    // eslint-disable-next-line compat/compat
    this.resizeObserver = new ResizeObserver(debounce(entries => {
      const rect = entries[0].contentRect;
      // make sure sizes are not zeros
      if (rect.width && rect.height) {
        this.updateLayout();
      }
    }, 300));
    this.resizeObserver.observe(parentContainer);
  }

  componentDidUpdate(prevProps, prevState) {
    // update only when there is parent size, because the initial
    // render will be updated by resizeObserver.
    const { options: prevOptions } = prevProps;
    const { parentSize: prevParentSize } = prevState;
    const { options } = this.props;
    if (hasOptionUpdates(prevOptions, options) && !prevParentSize) {
      this.updateLayout();
    }
  }

  componentWillUnmount() {
    this.resizeObserver.disconnect();
  }

  /**
   * Get renderable area size.
   */
  getParentSize() {
    const parent = getSizingParent(this.elem);
    const { padding } = getComputedDimension(parent);
    const { context } = this.props;

    let { width, height } = parent.getBoundingClientRect();
    width = Math.max(0, width - padding.left - padding.right);
    height = Math.max(0, height - padding.top - padding.bottom);

    // limit the maximum size for editor
    if (context === 'editor') {
      width = Math.min(width, MAX_WIDTH_IN_EDITOR);
      // keep the chart a fixed ratio ratio
      height = Math.min(height, MAX_HEIGHT_IN_EDITOR, 0.67 * width);
    }

    return {
      width,
      height,
    };
  }

  /**
   * Parse component.props
   */
  parseProps = ({ options, data, compileLite = true }) => {
    const { error, mode, spec, autoresize } = this.parseOptions(options, compileLite);
    const specData = spec.data && find(spec.data, item => item.name === "current_query");
    if (specData) {
      // Inject actual data to the data source in spec
      specData.values = data.rows;
      // ignore `url` and `format` config
      delete specData.url;
      delete specData.format;
    }
    if (!specData) {
      const inlineData = { values: data.rows };
      spec.data = mode === Mode.VegaLite && !compileLite ? inlineData : [inlineData];
    }
    return { error, mode, spec, autoresize };
  };

  /**
   * Calculate the height and width in pixels based on
   *    1. spec specification
   *    2. parent container size.
   */
  autoLayout({ error, spec, autoresize } = {}) {
    let width = 0;
    let height = 0;

    if (!this.elem || error) return { width, height };

    const { width: specWidth, height: specHeight } = spec;
    if (!autoresize) return { width: specWidth, height: specHeight };

    // obtain prent size and adjust for parent padding
    const { parentSize } = this.state;
    if (!parentSize) return { width, height };

    width = parentSize.width;
    height = parentSize.height;

    // adjust for Vega view padding
    let hAdjust = 0;
    let vAdjust = 0;
    const { context } = this.props;

    if (context === "editor") {
      vAdjust = 60;
    } else if (context === 'widget') {
      // add a little horizontal padding for widgets
      hAdjust = 20;
    }

    const specPadding = spec.padding !== undefined ? spec.padding : 5;

    if (typeof spec.padding === "number") {
      hAdjust += 2 * specPadding;
      vAdjust += 2 * specPadding;
    } else if (isObject(specPadding)) {
      hAdjust += (specPadding.left || 0) + (specPadding.right || 0);
      vAdjust += (specPadding.top || 0) + (specPadding.bottom || 0);
    }

    width = Math.floor(specWidth || width) - hAdjust;
    height = Math.floor(specHeight || height) - vAdjust;

    return { width, height };
  }

  /**
   * Updaete width & height in spec based on parent size,
   * but don't sync the width/height pixels into spec, because
   * we want the spec to be stored as autoresize, unless
   * users specifically set width and height.
   *
   * This is also why we are only updating state and operate
   * on vega.view directly.)
   *
   * @param {number} parentSize - parent width and height
   * @param {number} width - manual width in pixels
   * @param {number} height - manual height in pixels
   */
  updateLayout() {
    if (!this.vega || !this.vega.vegaEmbed.current) return;
    const newSize = this.getParentSize();
    const oldSize = this.state.parentSize;
    if (
      !oldSize ||
      Math.abs(newSize.width - oldSize.width) > RESIZE_THRESHOLD ||
      Math.abs(newSize.height - oldSize.height) > RESIZE_THRESHOLD
    ) {
      this.setState({ parentSize: newSize });
    }
  }

  render() {
    const props = this.props;
    const { options, data } = props;
    // parseProps is cached by memoization
    const { error, mode, spec, autoresize } = this.parseProps({ options, data });
    const { width, height } = this.autoLayout({ error, spec, autoresize });

    const alertContent = (
      <React.Fragment>
        {" "}
        {error ? (
          <React.Fragment>
            {" "}
            <strong>{error === "Invalid spec" ? "Your spec is not valid" : error}</strong>. <br />
          </React.Fragment>
        ) : null}{" "}
        See{" "}
        <a target="_blank" rel="noopener noreferrer" href={`https://vega.github.io/${mode}/examples/`}>
          {" "}
          Example Gallery{" "}
        </a>
        fore inspirations.
      </React.Fragment>
    );
    const alertInvalidSpec = (
      <Alert message={`Invalid ${NAMES[mode]} Spec`} description={alertContent} type="warning" showIcon />
    );

    // if calling from editor, append an edit link
    let editLink = null;
    if (this.props.context === "editor") {
      const vegaEditorBase = "https://vega.github.io/editor/";
      const vegaUrl = `${vegaEditorBase}#/custom/${mode}/`;

      // Obtain the raw spec from text, so we can link to both Vega and Vega-Lite
      const updateVegaUrl = e => {
        let specText = options.spec;
        if (options.lang === "yaml") {
          specText = yaml2json(specText, mode).specText;
        }
        if (autoresize) {
          let updatedSpec = { ...spec };
          if (mode === Mode.VegaLite) {
            updatedSpec = this.parseProps({ options, data, compileLite: false }).spec;
          }
          updatedSpec.width = width;
          updatedSpec.height = height;
          specText = stringify(updatedSpec);
        }
        const compressed = LZString.compressToEncodedURIComponent(specText);
        e.target.href = `${vegaEditorBase}#/url/${mode}/${compressed}`;
      };

      editLink = (
        <div className="vega-external-link">
          <a href={vegaUrl} target="_blank" rel="noopener noreferrer" onClick={updateVegaUrl}>
            <Icon type="edit" /> Edit in Official Vega Editor
          </a>
        </div>
      );
    }

    return (
      <div
        className="vega-visualization-container"
        ref={elem => {
          this.elem = elem;
        }}>
        {error ? (
          alertInvalidSpec
        ) : (
          <Vega
            className="vega-canvas-container"
            ref={elem => {
              this.vega = elem;
            }}
            width={width}
            height={height}
            spec={spec}
            enableHover
            tooltip={new Handler().call}
            actions={false} // hide vega actions
          />
        )}
        {editLink}
      </div>
    );
  }
}
