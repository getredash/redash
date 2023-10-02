import { isFinite } from "lodash";
import React, { useState, useEffect, ReactNode } from "react";
import cx from "classnames";
import resizeObserver from "@/services/resizeObserver";
import { RendererPropTypes } from "@/visualizations/prop-types";

import { getCounterData } from "./utils";

import "./render.less";

import { formatNumber } from "@/services/formatNumber";
import NotEnoughData from "@/components/NotEnoughData";

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

export default function Renderer({ data, options, visualizationName }: any) {
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
    showTrend,
    trendPositive,
    counterValue,
    counterValueTooltip,
    targetValue,
    targetValueTooltip,
    counterLabel,
  } = getCounterData(data.rows, options, visualizationName);

  if (data?.rows?.length === 0 || !data?.rows) return <NotEnoughData />;
  return (
    <div
      className={cx("addressable-counter-visualization-container", {
        "trend-positive": showTrend && trendPositive,
        "trend-negative": showTrend && !trendPositive,
      })}>
      {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'Dispatch<SetStateAction<null>>' is not assig... Remove this comment to see the full error message */}
      <div className="counter-visualization-content" ref={setContainer}>
        <div style={getCounterStyles(scale)}>
          <div className="counter-visualization-value-wrap">
            <div
              className="counter-visualization-target"
              title={(targetValue ? targetValueTooltip : counterValueTooltip) as string}>
              {(targetValue ?? counterValue) as ReactNode}
            </div>
            {targetValue && (
              <div className="counter-visualization-value" title={counterValueTooltip as string}>
                {showTrend ? (trendPositive ? "+" : "-") : ""}
                {counterValue as ReactNode}
              </div>
            )}
          </div>
          <div className="counter-visualization-label">{counterLabel as ReactNode}</div>
        </div>
      </div>
    </div>
  );
}

Renderer.propTypes = RendererPropTypes;
