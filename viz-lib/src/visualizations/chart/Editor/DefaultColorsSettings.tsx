import { map } from "lodash";
import React, { useMemo, useCallback } from "react";
import Table from "antd/lib/table";
import ColorPicker from "@/components/ColorPicker";
import { EditorPropTypes } from "@/visualizations/prop-types";
import { AllColorPalettes } from "@/visualizations/ColorPalette";
import getChartData from "../getChartData";
import { Section, Select } from "@/components/visualizations/editor";

export default function DefaultColorsSettings({ options, data, onOptionsChange }: any) {
  const colors = useMemo(
    () => ({
      Automatic: null,
      // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      ...AllColorPalettes[options.color_scheme],
    }),
    [options.color_scheme]
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
          onChange={(value: any) => updateSeriesOption(item.key, "color", value)}
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'Element' is not assignable to type 'never'.
          addonAfter={<ColorPicker.Label color={item.color} presetColors={colors} />}
        />
      ),
    },
  ];

  return (
    <React.Fragment>
      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
          <Select
            label="Color Scheme"
            defaultValue={options.color_scheme}
            data-test="ColorScheme"
            onChange={(val : any) => onOptionsChange({ color_scheme: val })}>
            {Object.keys(AllColorPalettes).map(option => (
             // @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message
              <Select.Option data-test={`ColorOption${option}`} key={option} value={option}>{option}</Select.Option>
            ))}
          </Select>
        </Section>
      {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'boolean[]' is not assignable to type 'object... Remove this comment to see the full error message */}
      <Table showHeader={false} dataSource={series} columns={columns} pagination={false} />
    </React.Fragment>
  )
}

DefaultColorsSettings.propTypes = EditorPropTypes;
