// const vegaSchema = require('vega/build/vega-schema.json');
// const vegaLiteSchema = require('vega-lite/build/vega-lite-schema.json');

export const Mode = {
  Vega: "vega",
  VegaLite: "vega-lite",
};

export const NAME_TO_MODE = {
  vega: Mode.Vega,
  "vega-lite": Mode.VegaLite,
};

export const NAMES = {
  [Mode.Vega]: "Vega",
  [Mode.VegaLite]: "Vega-Lite",
};

/**
 * Translate Redash data column types to Vega types.
 * All Redash types are defined here: https://github.com/getredash/redash/blob/efcf22079f54af50dd683afd47f42d5a925749c2/redash/query_runner/__init__.py#L40
 */
export const COLOMN_TYPE_TO_VEGA_TYPE = {
  integer: "quantitative",
  float: "quantitative",
  string: "nominal",
  boolean: "ordinal",
  datetime: "temporal",
  time: "temporal",
};

const vegaSchemaUrl = "https://vega.github.io/schema/vega/v5.json";
const vegaLiteSchemaUrl = "https://vega.github.io/schema/vega-lite/v4.json";

export const VEGA_LITE_START_SPEC = `$schema: ${vegaLiteSchemaUrl}
description: |
  {{ query.name }}
autosize: fit
data:
  name: current_query
  url: "{{ dataUrl }}"
  {{#hasTemporal}}
  format:
    type: csv
    parse:
      {{#temporalFields}}
      {{ name }}: "date:{{ dateFormat }}"
      {{/temporalFields}}
  {{/hasTemporal}}
{{#hasMultiSeries}}
transform:
  - fold:
      {{#serieses }}
      - {{ name }}
      {{/serieses}}
    as:
      - series
      - value
{{/hasMultiSeries}}
mark:
  type: {{ mark }}
  tooltip: true
encoding:
{{#x}}
  x:
    field: "{{ name }}"
    type: "{{ type }}"
    title: "{{ title }}"
{{/x}}
{{#y}}
  y:
    field: "{{ name }}"
    type: "{{ type }}"
    title: "{{ title }}"
{{/y}}
{{#color}}
  color:
    field: "{{ name }}"
    type: "{{ type }}"
    title: "{{ title }}"
{{/color}}
{{#hasMultiSeries}}
  y:
    field: value
    type: quantitative
    title: ""
    aggregate: sum
  color:
    field: series
    type: nominal
    title: ""
    sort:
      {{#serieses}}
      - "{{ name }}"
      {{/serieses}}
{{/hasMultiSeries}}`;

export const DEFAULT_SPECS = {
  [Mode.Vega]: {
    $schema: vegaSchemaUrl,
  },
  [Mode.VegaLite]: {
    $schema: vegaLiteSchemaUrl,
  },
};

// themes in use
export const THEMES = [
  "custom",
  "bold",
  "pastel",
  "prism",
  "excel",
  "ggplot2",
  "quartz",
  "vox",
  "fivethirtyeight",
  "latimes",
];
export const THEME_NAMES = {
  custom: "Custom Theme",
  bold: "Carto Bold",
  pastel: "Carto Pastel",
  prism: "Carto Prism",
  dark: "Dark",
  excel: "Microsoft Excel",
  ggplot2: "ggplot2",
  quartz: "Quartz",
  vox: "Vox",
  fivethirtyeight: "538",
  latimes: "Los Angeles Times",
};

export const DEFAULT_OPTIONS = {
  lang: "yaml",
  mode: Mode.VegaLite,
  spec: "",
  theme: "custom",
};
