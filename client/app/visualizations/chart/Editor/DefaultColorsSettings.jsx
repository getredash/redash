import { map } from "lodash";
import React, { useMemo, useCallback } from "react";
import Table from "antd/lib/table";
import ColorPicker from "@/components/ColorPicker";
import { EditorPropTypes } from "@/visualizations";
import ColorPalette from "@/visualizations/ColorPalette";
import getChartData from "../getChartData";

export default function DefaultColorsSettings({ options, data, onOptionsChange }) {
  const colors = useMemo(
    () => ({
      Automatic: null,
      ...ColorPalette,
    }),
    []
  );

  const series = useMemo(
    () =>
      map(getChartData(data.rows, options), ({ name }) => ({
        key: name,
        color: (options.seriesOptions[name] || {}).color || null,
      })),
    [options, data]
  );

  const updateSeriesOption = useCallback(
    (key, prop, value) => {
      onOptionsChange({
        seriesOptions: {
          [key]: {
            [prop]: value,
          },
        },
      });
    },
    [onOptionsChange]
  );

  const columns = [
    {
      title: "Series",
      dataIndex: "key",
    },
    {
      title: "Color",
      dataIndex: "color",
      width: "1%",
      className: "text-nowrap",
      render: (unused, item) => (
        <ColorPicker
          data-test={`Chart.Series.${item.key}.Color`}
          interactive
          presetColors={colors}
          placement="topRight"
          color={item.color}
          onChange={value => updateSeriesOption(item.key, "color", value)}
          addonAfter={<ColorPicker.Label color={item.color} presetColors={colors} />}
        />
      ),
    },
  ];

  return <Table showHeader={false} dataSource={series} columns={columns} pagination={false} />;
}

DefaultColorsSettings.propTypes = EditorPropTypes;
