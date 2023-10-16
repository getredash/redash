import React from "react";
import { Section, Switch } from "@/components/visualizations/editor";
import { EditorPropTypes } from "@/visualizations/prop-types";

import AxisSettings from "./AxisSettings";

export default function YAxisSettings({ options, onOptionsChange }: any) {
  const [leftYAxis, rightYAxis] = options.yAxis;

  return (
    <React.Fragment>
      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section.Title>{!options.swappedAxes ? "Left Y Axis" : "X Axis"}</Section.Title>

      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        <AxisSettings
          id="LeftYAxis"
          features={{ range: true }}
          options={leftYAxis}
          // @ts-expect-error ts-migrate(2322) FIXME: Type '(axis: any) => any' is not assignable to typ... Remove this comment to see the full error message
          onChange={(axis: any) => onOptionsChange({ yAxis: [axis, rightYAxis] })}
        />
      </Section>

      {options.globalSeriesType !== "heatmap" && !options.swappedAxes && (
        <React.Fragment>
          {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
          <Section.Title>Right Y Axis</Section.Title>

          {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
          <Section>
            <AxisSettings
              id="RightYAxis"
              features={{ range: true }}
              options={rightYAxis}
              // @ts-expect-error ts-migrate(2322) FIXME: Type '(axis: any) => any' is not assignable to typ... Remove this comment to see the full error message
              onChange={(axis: any) => onOptionsChange({ yAxis: [leftYAxis, axis] })}
            />
          </Section>

          {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
          <Section>
            <Switch
              id="chart-editor-y-axis-align-at-zero"
              data-test="Chart.YAxis.AlignAtZero"
              defaultChecked={options.alignYAxesAtZero}
              onChange={(alignYAxesAtZero: any) => onOptionsChange({ alignYAxesAtZero })}>
              Align Y Axes at Zero
            </Switch>
          </Section>
        </React.Fragment>
      )}

      {options.globalSeriesType === "heatmap" && (
        <React.Fragment>
          {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
          <Section>
            <Switch
              id="chart-editor-y-axis-sort"
              data-test="Chart.LeftYAxis.Sort"
              defaultChecked={options.sortY}
              onChange={(sortY: any) => onOptionsChange({ sortY })}>
              Sort Values
            </Switch>
          </Section>

          {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
          <Section>
            <Switch
              id="chart-editor-y-axis-reverse"
              data-test="Chart.LeftYAxis.Reverse"
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
