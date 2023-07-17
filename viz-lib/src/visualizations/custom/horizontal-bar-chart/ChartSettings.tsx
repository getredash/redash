import { map } from "lodash";
import React from "react";
import { Section, Select } from "@/components/visualizations/editor";
import { EditorPropTypes } from "@/visualizations/prop-types";

const colorSchemes = {
  purpleGradient: "Purple Gradient",
  redGradient: "Red Gradient",
};

export default function ChartSettings({ options, onOptionsChange }: any) {
  return (
    // @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message
    <Section>
      <Select
        label="Color Scheme"
        data-test="HorizontalBarChart.ColorScheme"
        defaultValue={options.colorScheme}
        onChange={(colorScheme: any) => onOptionsChange({ colorScheme })}>
        {map(colorSchemes, (name, value) => (
          // @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message
          <Select.Option key={value} data-test={`HorizontalBarChart.ColorScheme.${value}`}>
            {name}
            {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
          </Select.Option>
        ))}
      </Select>
    </Section>
  );
}

ChartSettings.propTypes = EditorPropTypes;
