import React, { useState, useEffect, useMemo } from "react";
import { get, find, pick, map, mapValues } from "lodash";
import PivotTableUI from "react-pivottable/PivotTableUI";
import { RendererPropTypes } from "@/visualizations";
import { formatColumnValue } from "@/lib/utils";

import "react-pivottable/pivottable.css";
import "./renderer.less";

const VALID_OPTIONS = [
  "rows",
  "cols",
  "vals",
  "aggregatorName",
  "valueFilter",
  "sorters",
  "rowOrder",
  "colOrder",
  "derivedAttributes",
  "rendererName",
  "hiddenAttributes",
  "hiddenFromAggregators",
  "hiddenFromDragDrop",
  "menuLimit",
  "unusedOrientationCutoff",
  "controls",
  "rendererOptions",
];

function formatRows({ rows, columns }) {
  return map(rows, row => mapValues(row, (value, key) => formatColumnValue(value, find(columns, { name: key }).type)));
}

export default function Renderer({ data, options, onOptionsChange }) {
  const [config, setConfig] = useState({ ...options });
  const dataRows = useMemo(() => formatRows(data), [data]);

  useEffect(() => {
    setConfig({ ...options });
  }, [options]);

  const onChange = updatedOptions => {
    const validOptions = pick(updatedOptions, VALID_OPTIONS);
    setConfig({ ...validOptions });
    onOptionsChange(validOptions);
  };

  // Legacy behavior: hideControls when controls.enabled is true
  const hideControls = get(options, "controls.enabled");
  const hideRowTotals = !get(options, "rendererOptions.table.rowTotals");
  const hideColumnTotals = !get(options, "rendererOptions.table.colTotals");
  return (
    <div
      className="pivot-table-visualization-container"
      data-hide-controls={hideControls || null}
      data-hide-row-totals={hideRowTotals || null}
      data-hide-column-totals={hideColumnTotals || null}
      data-test="PivotTableVisualization">
      <PivotTableUI {...pick(config, VALID_OPTIONS)} data={dataRows} onChange={onChange} />
    </div>
  );
}

Renderer.propTypes = RendererPropTypes;
Renderer.defaultProps = { onOptionsChange: () => {} };
