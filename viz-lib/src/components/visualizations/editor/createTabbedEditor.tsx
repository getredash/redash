import { isFunction, map, filter, extend, merge } from "lodash";
import React from "react";
import Tabs from "antd/lib/tabs";
import { EditorPropTypes } from "@/visualizations/prop-types";

export const UpdateOptionsStrategy = {
  replace: (existingOptions: any, newOptions: any) => merge({}, newOptions),
  shallowMerge: (existingOptions: any, newOptions: any) => extend({}, existingOptions, newOptions),
  deepMerge: (existingOptions: any, newOptions: any) => merge({}, existingOptions, newOptions),
};

/*
(ts-migrate) TODO: Migrate the remaining prop types
...EditorPropTypes
*/
type OwnProps = {
    tabs?: {
        key: string;
        title: string | ((...args: any[]) => any);
        isAvailable?: (...args: any[]) => any;
        component: (...args: any[]) => any;
    }[];
};

type Props = OwnProps & typeof TabbedEditor.defaultProps;

// @ts-expect-error ts-migrate(2339) FIXME: Property 'options' does not exist on type 'Props'.
export function TabbedEditor({ tabs, options, data, onOptionsChange, ...restProps }: Props) {
  const optionsChanged = (newOptions: any, updateStrategy = UpdateOptionsStrategy.deepMerge) => {
    onOptionsChange(updateStrategy(options, newOptions));
  };

  // @ts-expect-error ts-migrate(2322) FIXME: Type '(number | ((() => string) & (() => string)) ... Remove this comment to see the full error message
  tabs = filter(tabs, tab => (isFunction(tab.isAvailable) ? tab.isAvailable(options, data) : true));

  return (
    <Tabs animated={false} tabBarGutter={20}>
      {map(tabs, ({ key, title, component: Component }) => (
        <Tabs.TabPane
          key={key}
          tab={<span data-test={`VisualizationEditor.Tabs.${key}`}>{isFunction(title) ? title(options) : title}</span>}>
          <Component options={options} data={data} onOptionsChange={optionsChanged} {...restProps} />
        </Tabs.TabPane>
      ))}
    </Tabs>
  );
}

TabbedEditor.defaultProps = {
  tabs: [],
};

export default function createTabbedEditor(tabs: any) {
  return function TabbedEditorWrapper(props: any) {
    return <TabbedEditor {...props} tabs={tabs} />;
  };
}
