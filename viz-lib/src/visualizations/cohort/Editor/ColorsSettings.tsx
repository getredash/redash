import { isFinite } from "lodash";
import React from "react";
import { Section, ColorPicker, InputNumber } from "@/components/visualizations/editor";
import { EditorPropTypes } from "@/visualizations/prop-types";
import DefaultColorPalette from "@/visualizations/ColorPalette";

const ColorPalette = {
  White: "#FFFFFF",
  ...DefaultColorPalette,
};

const minSteps = 3;
const maxSteps = 20;

function validateSteps(value: any) {
  value = isFinite(value) ? value : parseInt(value, 10);
  value = isFinite(value) ? value : 0;
  return Math.max(minSteps, Math.min(value, maxSteps));
}

export default function ColorsSettings({
  options,
  onOptionsChange
}: any) {
  return (
    <React.Fragment>
      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        <ColorPicker
          layout="horizontal"
          label="Min Color"
          presetColors={ColorPalette}
          interactive
          color={options.colors.min}
          onChange={(min: any) => onOptionsChange({ colors: { min } })}
          // @ts-expect-error ts-migrate(2339) FIXME: Property 'Label' does not exist on type '({ classN... Remove this comment to see the full error message
          addonAfter={<ColorPicker.Label color={options.colors.min} presetColors={ColorPalette} />}
        />
      </Section>
      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        <ColorPicker
          layout="horizontal"
          label="Max Color"
          presetColors={ColorPalette}
          interactive
          color={options.colors.max}
          onChange={(max: any) => onOptionsChange({ colors: { max } })}
          // @ts-expect-error ts-migrate(2339) FIXME: Property 'Label' does not exist on type '({ classN... Remove this comment to see the full error message
          addonAfter={<ColorPicker.Label color={options.colors.max} presetColors={ColorPalette} />}
        />
      </Section>
      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        <InputNumber
          layout="horizontal"
          label="Steps"
          min={minSteps}
          max={maxSteps}
          value={options.colors.steps}
          onChange={(value: any) => onOptionsChange({ colors: { steps: validateSteps(value) } })}
        />
      </Section>
    </React.Fragment>
  );
}

ColorsSettings.propTypes = EditorPropTypes;
