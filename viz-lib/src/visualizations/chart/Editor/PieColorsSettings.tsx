import { each, map } from "lodash";
import React, { useMemo, useCallback } from "react";
import Table from "antd/lib/table";
import ColorPicker from "@/components/ColorPicker";
import { EditorPropTypes } from "@/visualizations/prop-types";
import ColorPalette from "@/visualizations/ColorPalette";
import getChartData from "../getChartData";

function getUniqueValues(chartData: any) {
  const uniqueValuesNames = new Set();
  each(chartData, series => {
    each(series.data, row => {
      uniqueValuesNames.add(row.x);
    });
  });
  return [...uniqueValuesNames];
}

export default function PieColorsSettings({
  options,
  data,
  onOptionsChange
}: any) {
  const colors = useMemo(
    () => ({
      Automatic: null,
      ...ColorPalette,
    }),
    []
  );

  const series = useMemo(
    () =>
      map(getUniqueValues(getChartData(data.rows, options)), value => ({
        key: value,
        // @ts-expect-error ts-migrate(2538) FIXME: Type 'unknown' cannot be used as an index type.
        color: (options.valuesOptions[value] || {}).color || null,
      })),
    [options, data]
  );

  const updateValuesOption = useCallback(
    (key, prop, value) => {
      onOptionsChange({
        valuesOptions: {
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
      title: "Values",
      dataIndex: "key",
    },
    {
      title: "Color",
      dataIndex: "color",
      width: "1%",
      render: (unused: any, item: any) => (
        <ColorPicker
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'.
          data-test={`Chart.Series.${item.key}.Color`}
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'boolean' is not assignable to type 'never'.
          interactive
          // @ts-expect-error ts-migrate(2322) FIXME: Type '{ "Indian Red": string; "Green 2": string; "... Remove this comment to see the full error message
          presetColors={colors}
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'.
          placement="topRight"
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'any' is not assignable to type 'never'.
          color={item.color}
          // @ts-expect-error ts-migrate(2322) FIXME: Type '(value: any) => void' is not assignable to t... Remove this comment to see the full error message
          onChange={(value: any) => updateValuesOption(item.key, "color", value)}
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'Element' is not assignable to type 'never'.
          addonAfter={<ColorPicker.Label color={item.color} presetColors={colors} />}
        />
      ),
    },
  ];

  return <Table showHeader={false} dataSource={series} columns={columns} pagination={false} />;
}

PieColorsSettings.propTypes = EditorPropTypes;
