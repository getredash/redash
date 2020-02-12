import { isFinite } from "lodash";
import React, { useState, useEffect } from "react";
import cx from "classnames";
import resizeObserver from "@/services/resizeObserver";
import { RendererPropTypes } from "@/visualizations";

import { getKpiData } from "./utils";

import "./render.less";

function getContainerStyles(scale) {
  return {
    msTransform: `scale(${scale})`,
    MozTransform: `scale(${scale})`,
    WebkitTransform: `scale(${scale})`,
    transform: `scale(${scale})`,
  };
}

function getCounterScale(container) {
  const inner = container.firstChild;
  const scale = Math.min(container.offsetWidth / inner.offsetWidth, container.offsetHeight / inner.offsetHeight);
  return Number(isFinite(scale) ? scale : 1).toFixed(2); // keep only two decimal places;
}

export default function Renderer({ data, options, visualizationName }) {
  const [scale, setScale] = useState("1.00");
  const [container, setContainer] = useState(null);

  useEffect(() => {
    if (container) {
      const unwatch = resizeObserver(container, () => {
        setScale(getCounterScale(container));
      });
      return unwatch;
    }
  }, [container]);

  useEffect(() => {
    if (container) {
      // update scaling when options or data change (new formatting, values, etc.
      // may change inner container dimensions which will not be tracked by `resizeObserver`);
      setScale(getCounterScale(container));
    }
  }, [data, options, container]);

  const { currentValue, trendDirection, deltaValue, targetValuePrefixLabel, targetValue } = getKpiData(
    data.rows,
    options
  );
  return (
    <div className="kpi-visualization-container">
      <div className="kpi-visualization-content" ref={setContainer}>
        <div style={getContainerStyles(scale)}>
          <div className="kpi-visualization-current-value">{currentValue}</div>

          {targetValue && (
            <div className={cx("kpi-visualization-delta-value", "trend-" + trendDirection)}>{deltaValue}</div>
          )}

          {targetValue && (
            <div className="kpi-visualization-target-value">
              {targetValuePrefixLabel} ({targetValue})
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

Renderer.propTypes = RendererPropTypes;
