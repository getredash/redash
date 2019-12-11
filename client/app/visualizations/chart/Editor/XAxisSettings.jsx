import React from "react";
import { Section, Switch } from "@/components/visualizations/editor";
import { EditorPropTypes } from "@/visualizations";

import AxisSettings from "./AxisSettings";

export default function XAxisSettings({ options, onOptionsChange }) {
  return (
    <React.Fragment>
      <AxisSettings
        id="XAxis"
        features={{ autoDetectType: true }}
        options={options.xAxis}
        onChange={xAxis => onOptionsChange({ xAxis })}
      />

      <Section>
        <Switch
          data-test="Chart.XAxis.Sort"
          defaultChecked={options.sortX}
          onChange={sortX => onOptionsChange({ sortX })}>
          Sort Values
        </Switch>
      </Section>

      <Section>
        <Switch
          data-test="Chart.XAxis.Reverse"
          defaultChecked={options.reverseX}
          onChange={reverseX => onOptionsChange({ reverseX })}>
          Reverse Order
        </Switch>
      </Section>

      <Section>
        <Switch
          data-test="Chart.XAxis.ShowLabels"
          defaultChecked={options.xAxis.labels.enabled}
          onChange={enabled => onOptionsChange({ xAxis: { labels: { enabled } } })}>
          Show Labels
        </Switch>
      </Section>
    </React.Fragment>
  );
}

XAxisSettings.propTypes = EditorPropTypes;
