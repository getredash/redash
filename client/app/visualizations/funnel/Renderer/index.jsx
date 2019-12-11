import { maxBy } from "lodash";
import React, { useMemo } from "react";
import Table from "antd/lib/table";
import Tooltip from "antd/lib/tooltip";
import { RendererPropTypes } from "@/visualizations";
import ColorPalette from "@/visualizations/ColorPalette";
import { createNumberFormatter } from "@/lib/value-format";

import prepareData from "./prepareData";
import FunnelBar from "./FunnelBar";
import "./index.less";

function generateRowKeyPrefix() {
  return Math.trunc(Math.random() * Number.MAX_SAFE_INTEGER).toString(36) + ":";
}

export default function Renderer({ data, options }) {
  const funnelData = useMemo(() => prepareData(data.rows, options), [data, options]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rowKeyPrefix = useMemo(() => generateRowKeyPrefix(), [funnelData]);

  const formatValue = useMemo(() => createNumberFormatter(options.numberFormat), [options.numberFormat]);

  const formatPercentValue = useMemo(() => {
    const format = createNumberFormatter(options.percentFormat);
    return value => {
      if (value < options.percentValuesRange.min) {
        return `<${format(options.percentValuesRange.min)}`;
      }
      if (value > options.percentValuesRange.max) {
        return `>${format(options.percentValuesRange.max)}`;
      }
      return format(value);
    };
  }, [options.percentFormat, options.percentValuesRange]);

  const columns = useMemo(() => {
    if (funnelData.length === 0) {
      return [];
    }

    const maxToPrevious = maxBy(funnelData, d => (isFinite(d.pctPrevious) ? d.pctPrevious : 0)).pctPrevious;
    return [
      {
        title: options.stepCol.displayAs,
        dataIndex: "step",
        width: "25%",
        className: "text-ellipsis",
        render: text => (
          <Tooltip title={text} mouseEnterDelay={0} mouseLeaveDelay={0}>
            {text}
          </Tooltip>
        ),
      },
      {
        title: options.valueCol.displayAs,
        dataIndex: "value",
        width: "45%",
        align: "center",
        render: (value, item) => (
          <FunnelBar align="center" color={ColorPalette.Cyan} value={item.pctMax}>
            {formatValue(value)}
          </FunnelBar>
        ),
      },
      {
        title: "% Max",
        dataIndex: "pctMax",
        width: "15%",
        align: "center",
        render: value => formatPercentValue(value),
      },
      {
        title: "% Previous",
        dataIndex: "pctPrevious",
        width: "15%",
        align: "center",
        render: value => (
          <FunnelBar className="funnel-percent-column" value={(value / maxToPrevious) * 100.0}>
            {formatPercentValue(value)}
          </FunnelBar>
        ),
      },
    ];
  }, [options.stepCol.displayAs, options.valueCol.displayAs, funnelData, formatValue, formatPercentValue]);

  if (funnelData.length === 0) {
    return null;
  }

  return (
    <div className="funnel-visualization-container">
      <Table
        columns={columns}
        dataSource={funnelData}
        rowKey={(record, index) => rowKeyPrefix + index}
        pagination={false}
      />
    </div>
  );
}

Renderer.propTypes = RendererPropTypes;
