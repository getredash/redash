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

function validateSteps(value) {
  value = isFinite(value) ? value : parseInt(value, 10);
  value = isFinite(value) ? value : 0;
  return Math.max(minSteps, Math.min(value, maxSteps));
}

export default function ColorsSettings({ options, onOptionsChange }) {
  return (
    <React.Fragment>
      <Section>
        <ColorPicker
          layout="horizontal"
          label="Min Color"
          presetColors={ColorPalette}
          interactive
          color={options.colors.min}
          onChange={min => onOptionsChange({ colors: { min } })}
          addonAfter={<ColorPicker.Label color={options.colors.min} presetColors={ColorPalette} />}
        />
      </Section>
      <Section>
        <ColorPicker
          layout="horizontal"
          label="Max Color"
          presetColors={ColorPalette}
          interactive
          color={options.colors.max}
          onChange={max => onOptionsChange({ colors: { max } })}
          addonAfter={<ColorPicker.Label color={options.colors.max} presetColors={ColorPalette} />}
        />
      </Section>
      <Section>
        <InputNumber
          layout="horizontal"
          label="Steps"
          min={minSteps}
          max={maxSteps}
          value={options.colors.steps}
          onChange={value => onOptionsChange({ colors: { steps: validateSteps(value) } })}
        />
      </Section>
    </React.Fragment>
  );
}

ColorsSettings.propTypes = EditorPropTypes;
