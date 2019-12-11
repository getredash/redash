import React from "react";
import { Section, Input } from "@/components/visualizations/editor";
import { EditorPropTypes } from "@/visualizations";

export default function Editor({ options, onOptionsChange }) {
  const onXAxisLabelChanged = xAxisLabel => {
    const newOptions = { ...options, xAxisLabel };
    onOptionsChange(newOptions);
  };

  const onYAxisLabelChanged = yAxisLabel => {
    const newOptions = { ...options, yAxisLabel };
    onOptionsChange(newOptions);
  };

  return (
    <React.Fragment>
      <Section>
        <Input
          label="X Axis Label"
          data-test="BoxPlot.XAxisLabel"
          value={options.xAxisLabel}
          onChange={event => onXAxisLabelChanged(event.target.value)}
        />
      </Section>

      <Section>
        <Input
          label="Y Axis Label"
          data-test="BoxPlot.YAxisLabel"
          value={options.yAxisLabel}
          onChange={event => onYAxisLabelChanged(event.target.value)}
        />
      </Section>
    </React.Fragment>
  );
}

Editor.propTypes = EditorPropTypes;
