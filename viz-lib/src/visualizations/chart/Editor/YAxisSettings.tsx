import React from "react";
import { Section, Switch } from "@/components/visualizations/editor";
import { EditorPropTypes } from "@/visualizations/prop-types";

import AxisSettings from "./AxisSettings";

export default function YAxisSettings({ options, onOptionsChange }: any) {
  const [leftYAxis, rightYAxis] = options.yAxis;

  return (
    <React.Fragment>
      <Section.Title>{!options.swappedAxes ? "Left Y Axis" : "X Axis"}</Section.Title>

      <Section>
        <AxisSettings
          id="LeftYAxis"
          features={{ range: true }}
          options={leftYAxis}
          onChange={(axis: any) => onOptionsChange({ yAxis: [axis, rightYAxis] })}
        />
      </Section>

      {options.globalSeriesType !== "heatmap" && !options.swappedAxes && (
        <React.Fragment>
          <Section.Title>Right Y Axis</Section.Title>

          <Section>
            <AxisSettings
              id="RightYAxis"
              features={{ range: true }}
              options={rightYAxis}
              onChange={(axis: any) => onOptionsChange({ yAxis: [leftYAxis, axis] })}
            />
          </Section>

          <Section>
            <Switch
              id="chart-editor-y-axis-align-at-zero"
              data-test="Chart.YAxis.AlignAtZero"
              // @ts-expect-error ts-migrate(2322) FIXME: Type 'any' is not assignable to type 'never'.
              defaultChecked={options.alignYAxesAtZero}
              onChange={(alignYAxesAtZero: any) => onOptionsChange({ alignYAxesAtZero })}>
              Align Y Axes at Zero
            </Switch>
          </Section>
        </React.Fragment>
      )}

      {options.globalSeriesType === "heatmap" && (
        <React.Fragment>
          <Section>
            <Switch
              id="chart-editor-y-axis-sort"
              data-test="Chart.LeftYAxis.Sort"
              // @ts-expect-error ts-migrate(2322) FIXME: Type 'any' is not assignable to type 'never'.
              defaultChecked={options.sortY}
              onChange={(sortY: any) => onOptionsChange({ sortY })}>
              Sort Values
            </Switch>
          </Section>

          <Section>
            <Switch
              id="chart-editor-y-axis-reverse"
              data-test="Chart.LeftYAxis.Reverse"
              // @ts-expect-error ts-migrate(2322) FIXME: Type 'any' is not assignable to type 'never'.
              defaultChecked={options.reverseY}
              onChange={(reverseY: any) => onOptionsChange({ reverseY })}>
              Reverse Order
            </Switch>
          </Section>
        </React.Fragment>
      )}
    </React.Fragment>
  );
}

YAxisSettings.propTypes = EditorPropTypes;
