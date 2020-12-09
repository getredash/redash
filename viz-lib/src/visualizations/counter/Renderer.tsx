import { isFinite } from "lodash";
import React, { useState, useEffect } from "react";
import cx from "classnames";
import resizeObserver from "@/services/resizeObserver";
import { RendererPropTypes } from "@/visualizations/prop-types";

import { getCounterData } from "./utils";

import "./render.less";

function getCounterStyles(scale: any) {
  return {
    msTransform: `scale(${scale})`,
    MozTransform: `scale(${scale})`,
    WebkitTransform: `scale(${scale})`,
    transform: `scale(${scale})`,
  };
}

function getCounterScale(container: any) {
  const inner = container.firstChild;
  const scale = Math.min(container.offsetWidth / inner.offsetWidth, container.offsetHeight / inner.offsetHeight);
  return Number(isFinite(scale) ? scale : 1).toFixed(2); // keep only two decimal places
}

export default function Renderer({
  data,
  options,
  visualizationName
}: any) {
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

  const {
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'showTrend' does not exist on type '{}'.
    showTrend,
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'trendPositive' does not exist on type '{... Remove this comment to see the full error message
    trendPositive,
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'counterValue' does not exist on type '{}... Remove this comment to see the full error message
    counterValue,
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'counterValueTooltip' does not exist on t... Remove this comment to see the full error message
    counterValueTooltip,
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'targetValue' does not exist on type '{}'... Remove this comment to see the full error message
    targetValue,
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'targetValueTooltip' does not exist on ty... Remove this comment to see the full error message
    targetValueTooltip,
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'counterLabel' does not exist on type '{}... Remove this comment to see the full error message
    counterLabel,
  } = getCounterData(data.rows, options, visualizationName);
  return (
    <div
      className={cx("counter-visualization-container", {
        "trend-positive": showTrend && trendPositive,
        "trend-negative": showTrend && !trendPositive,
      })}>
      {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'Dispatch<SetStateAction<null>>' is not assig... Remove this comment to see the full error message */}
      <div className="counter-visualization-content" ref={setContainer}>
        <div style={getCounterStyles(scale)}>
          <div className="counter-visualization-value" title={counterValueTooltip}>
            {counterValue}
          </div>
          {targetValue && (
            <div className="counter-visualization-target" title={targetValueTooltip}>
              ({targetValue})
            </div>
          )}
          <div className="counter-visualization-label">{counterLabel}</div>
        </div>
      </div>
    </div>
  );
}

Renderer.propTypes = RendererPropTypes;
