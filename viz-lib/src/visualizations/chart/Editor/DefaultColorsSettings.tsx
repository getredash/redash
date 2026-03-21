import { map } from "lodash";
import React, { useMemo, useCallback } from "react";
import Table from "antd/lib/table";
import ColorPicker from "@/components/ColorPicker";
import { EditorPropTypes } from "@/visualizations/prop-types";
import { AllColorPalettes } from "@/visualizations/ColorPalette";
import getChartData from "../getChartData";
import { Section, Select } from "@/components/visualizations/editor";

const SelectOption = (Select as any).Option;

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
    (key: any, prop: any, value: any) => {
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
          presetColors={colors}
          placement="topRight"
          color={item.color}
          onChange={(value: any) => updateSeriesOption(item.key, "color", value)}
          addonAfter={<ColorPicker.Label color={item.color} presetColors={colors} />}
        />
      ),
    },
  ];

  return (
    <React.Fragment>
      <Section>
        <Select
          label="Color Scheme"
          defaultValue={options.color_scheme}
          data-test="ColorScheme"
          onChange={(val: any) => onOptionsChange({ color_scheme: val })}
        >
          {Object.keys(AllColorPalettes).map((option) => (
            <SelectOption data-test={`ColorOption${option}`} key={option} value={option}>
              {option}
            </SelectOption>
          ))}
        </Select>
      </Section>
      <Table showHeader={false} dataSource={series} columns={columns} pagination={false} />
    </React.Fragment>
  );
}

DefaultColorsSettings.propTypes = EditorPropTypes;
