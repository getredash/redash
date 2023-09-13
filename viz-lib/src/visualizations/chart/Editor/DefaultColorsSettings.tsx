// @ts-nocheck

import { map } from "lodash";
import React, { useMemo, useCallback } from "react";
import Table from "antd/lib/table";
import ColorPicker from "@/components/ColorPicker";
import { EditorPropTypes } from "@/visualizations/prop-types";
import ColorPalette from "@/visualizations/ColorPalette";
import getChartData from "../getChartData";

export default function DefaultColorsSettings({ options, data, onOptionsChange }: any) {
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
      render: (unused: any, item: any) => (
        <ColorPicker
          data-test={`Chart.Series.${item.key}.Color`}
          interactive
          // @ts-expect-error ts-migrate(2322) FIXME: Type '{ "Indian Red": string; "Green 2": string; "... Remove this comment to see the full error message
          presetColors={colors}
          placement="topRight"
          color={item.color}
          onChange={(value: any) => updateSeriesOption(item.key, "color", value)}
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'Element' is not assignable to type 'never'.
          addonAfter={<ColorPicker.Label color={item.color} presetColors={colors} />}
        />
      ),
    },
  ];

  return <Table showHeader={false} dataSource={series as any} columns={columns} pagination={false} />;
}

DefaultColorsSettings.propTypes = EditorPropTypes;
