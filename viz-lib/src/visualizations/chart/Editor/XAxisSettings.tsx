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
        onChange={(xAxis: any) => onOptionsChange({ xAxis })}
      />

      <Section>
        <Switch
          data-test="Chart.XAxis.Sort"
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'any' is not assignable to type 'never'.
          defaultChecked={options.sortX}
          onChange={(sortX: any) => onOptionsChange({ sortX })}>
          Sort Values
        </Switch>
      </Section>

      <Section>
        <Switch
          data-test="Chart.XAxis.Reverse"
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'any' is not assignable to type 'never'.
          defaultChecked={options.reverseX}
          onChange={(reverseX: any) => onOptionsChange({ reverseX })}>
          Reverse Order
        </Switch>
      </Section>

      <Section>
        <Switch
          data-test="Chart.XAxis.ShowLabels"
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'any' is not assignable to type 'never'.
          defaultChecked={options.xAxis.labels.enabled}
          onChange={(enabled: any) => onOptionsChange({ xAxis: { labels: { enabled } } })}>
          Show Labels
        </Switch>
      </Section>
    </React.Fragment>
  );
}

XAxisSettings.propTypes = EditorPropTypes;
