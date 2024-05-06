import React from "react";
import { Section, Switch } from "@/components/visualizations/editor";
import { EditorPropTypes } from "@/visualizations/prop-types";

import AxisSettings from "./AxisSettings";

export default function XAxisSettings({ options, onOptionsChange }: any) {
  return (
    <React.Fragment>
      <AxisSettings
        id="XAxis"
        features={{ autoDetectType: true }}
        options={options.xAxis}
        // @ts-expect-error ts-migrate(2322) FIXME: Type '(xAxis: any) => any' is not assignable to ty... Remove this comment to see the full error message
        onChange={(xAxis: any) => onOptionsChange({ xAxis })}
      />

      <Section>
        <Switch
          data-test="Chart.XAxis.Sort"
          defaultChecked={options.sortX}
          onChange={(sortX: any) => onOptionsChange({ sortX })}>
          Sort Values
        </Switch>
      </Section>

      <Section>
        <Switch
          data-test="Chart.XAxis.Reverse"
          defaultChecked={options.reverseX}
          onChange={(reverseX: any) => onOptionsChange({ reverseX })}>
          Reverse Order
        </Switch>
      </Section>

      <Section>
        <Switch
          data-test="Chart.XAxis.ShowLabels"
          defaultChecked={options.xAxis.labels.enabled}
          onChange={(enabled: any) => onOptionsChange({ xAxis: { labels: { enabled } } })}>
          Show Labels
        </Switch>
      </Section>
    </React.Fragment>
  );
}

XAxisSettings.propTypes = EditorPropTypes;
