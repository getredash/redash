import Mustache from "mustache";
import YAML from "js-yaml";
import * as vegaThemes from "vega-themes";
import * as vl from "vega-lite";
import stringify from "json-stringify-pretty-compact";
import { merge, isPlainObject } from "lodash";

import { visualizationsSettings } from "@@/visualizations/visualizationsSettings";
import { Mode, COLOMN_TYPE_TO_VEGA_TYPE, VEGA_LITE_START_SPEC, DEFAULT_SPECS } from "./consts";
import redashThemes from "./theme";

function convertDateFormat(momentFormat) {
  return momentFormat
    .replace("YYYY", "%Y")
    .replace("YY", "%y")
    .replace("MM", "%m")
    .replace("DD", "%d")
    .replace("HH", "%h")
    .replace("mm", "%m")
    .replace("ss", "%s");
}

function isNumericType(type) {
  return type === "float" || type === "integer" || type === "number";
}

function isDatetimeType(type) {
  return type === "date" || type === "datetime";
}

/**
 * Get markt type based on x axis
 */
function getMarkType(x) {
  if (!x) return "bar";
  if (x.type === "temporal") return "line";
  if (x.type === "quantitative") return "point";
  return "bar";
}

const dateFormat = convertDateFormat(visualizationsSettings.dateFormat || "YYYY-MM-DD");

function toVegaField(col) {
  const type = COLOMN_TYPE_TO_VEGA_TYPE[col.type] || "nominal";
  return {
    name: col.name,
    type: type,
    title: col.friendly_name || col.name,
  };
}

/**
 * Render initial spec text based on column types
 */
export function renderInitialSpecText(options, { data, query }) {
  let error = null;
  let x = null; // x column
  let y = null; // y column
  let color = null; // color column
  let serieses = null;
  const numericFields = []; // numbers, metric columns
  const nominalFields = []; // text, dimension columns
  const temporalFields = [];
  const { spec: specText, lang, mode } = options;
  let { origLang, origMode } = options;
  let spec = { ...DEFAULT_SPECS[mode] };

  // if spec is empty, render the default spec
  if (!specText || !specText.trim()) {
    // since we are rendering from JSON & Vega-Lite, set origLang & origMode
    // to appropriate values
    origLang = "json";
    origMode = Mode.VegaLite;
    // infer xy fields based on data types
    if (data && data.columns && data.columns.length > 0) {
      data.columns.forEach(col => {
        // default Vega schema expects "date" and "count" field
        if (isDatetimeType(col.type)) {
          if (!x) {
            x = toVegaField(col);
          }
          temporalFields.push(toVegaField(col));
        } else if (isNumericType(col.type)) {
          numericFields.push(toVegaField(col));
        } else {
          nominalFields.push(toVegaField(col));
        }
      });
      // if still haven't found x column, use the first nominal column
      if (!x) {
        x = nominalFields[0];
      }
      if (numericFields.length === 1) {
        // if only one metric
        y = numericFields[0];
        // color column is the first none-x column
        color = nominalFields.find(col => col !== x);
      } else {
        serieses = numericFields;
      }
    }

    const hasMultiSeries = !!serieses;
    const mark = getMarkType(x);
    // if bar chart, use color dimension as the groupby column
    const facetColumn = mark === "bar" && (hasMultiSeries ? { name: "series" } : color);
    const params = {
      x,
      y,
      color,
      temporalFields,
      serieses,
      hasMultiSeries,
      facetColumn, // for groupped bar chart
      mark,
      query,
      dateFormat,
      dataUrl: query ? query.getDataUrl("csv", false) : null,
    };
    // render as Vega-lite JSON first
    spec = Mustache.render(VEGA_LITE_START_SPEC, params);
    const result = parseSpecText({ spec, lang: "yaml", mode: Mode.VegaLite });
    spec = result.spec;
    if (result.error) {
      console.warn("Failed to generate initial vega spec");
      console.warn(result.error, spec);
    }
  } else {
    const result = parseSpecText({ spec: specText, lang: origLang, mode: origMode });
    spec = result.spec;
    error = result.error;
  }

  const { width, height } = spec;
  // if original mode is Vega-lite, convert to vega
  if (origMode === Mode.VegaLite && mode === Mode.Vega) {
    try {
      spec = vl.compile(spec).spec;
    } catch (err) {
      // silently exit
    }
    // revert width & height values (so we can have auto resize)
    // must remove undefined values, otherwise YAML dump will fail
    if (!width) {
      delete spec.width;
    }
    if (!height) {
      delete spec.height;
    }
  }

  return { error, specText: dumpSpecText(spec, lang, specText) };
}

export function dumpSpecText(spec, lang, origText = "") {
  try {
    if (lang === "yaml") {
      return YAML.safeDump(spec);
    }
    return stringify(spec);
  } catch (err) {
    return origText;
  }
}

export function yaml2json(specText, mode) {
  const { error, spec } = parseSpecText({ spec: specText, lang: "yaml", mode });
  specText = stringify(spec);
  return { error, specText };
}

export function json2yaml(specText, mode) {
  const { error, spec } = parseSpecText({ spec: specText, lang: "json", mode });
  specText = YAML.safeDump(spec);
  return { error, specText };
}

/**
 * Apply theme config to the spec
 */
export function applyTheme(spec, theme) {
  // do nothing if this is a custom theme
  if (!spec) return;
  const config = redashThemes[theme] || vegaThemes[theme];
  if (config) {
    spec.config = merge({}, config, spec.config);
  }
  return spec;
}

/**
 * Parse spec text to JS object
 */
export function parseSpecText({ spec: specText, lang, mode }) {
  let error = null;
  let spec = { ...DEFAULT_SPECS[mode] };

  // if empty string, return the default spec
  if (!specText || !specText.trim()) {
    return { error: "You entered an empty spec", spec };
  }
  // if lang is not specified, try parse as JSON first
  if (!lang || lang === "json") {
    try {
      spec = JSON.parse(specText);
      lang = "json";
    } catch (err) {
      error = err.message;
    }
  }
  // try parse as YAML, too
  if (!lang || lang === "yaml") {
    try {
      const loaded = YAML.safeLoad(specText);
      lang = "yaml";
      if (!isPlainObject(loaded)) {
        error = "Invalid spec";
      } else {
        spec = loaded;
      }
    } catch (err) {
      error = err.message;
    }
  }
  // infer mode if not set
  if (!mode && spec && spec.$schema && spec.$schema.indexOf("vega-lite") !== -1) {
    mode = Mode.VegaLite;
  } else {
    mode = Mode.Vega;
  }
  return { error, spec, lang, mode };
}
