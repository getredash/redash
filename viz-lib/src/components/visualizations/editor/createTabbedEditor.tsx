import { merge } from "lodash";
import React from "react";
import Tabs from "antd/lib/tabs";
import { EditorPropTypes } from "@/visualizations/prop-types";

export const UpdateOptionsStrategy = {
  replace: (existingOptions: any, newOptions: any) => merge({}, newOptions),
  shallowMerge: (existingOptions: any, newOptions: any) => Object.assign({}, existingOptions, newOptions),
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

const defaultProps = {
  tabs: [],
};

type Props = OwnProps & typeof defaultProps;

// @ts-expect-error ts-migrate(2339) FIXME: Property 'options' does not exist on type 'Props'.
export function TabbedEditor({ tabs, options, data, onOptionsChange, ...restProps }: Props) {
  const optionsChanged = (newOptions: any, updateStrategy = UpdateOptionsStrategy.deepMerge) => {
    onOptionsChange(updateStrategy(options, newOptions));
  };

  // @ts-expect-error ts-migrate(2322) FIXME: Type '(number | ((() => string) & (() => string)) ... Remove this comment to see the full error message
  tabs = tabs.filter(tab => (typeof tab.isAvailable != "function" || tab.isAvailable(options, data)));

  return (
    <Tabs animated={false} tabBarGutter={20}>
      {tabs.map(({ key, title, component: Component }) => (
        <Tabs.TabPane
          key={key}
          tab={<span data-test={`VisualizationEditor.Tabs.${key}`}>{typeof title == "function" ? title(options) : title}</span>}>
          <Component options={options} data={data} onOptionsChange={optionsChanged} {...restProps} />
        </Tabs.TabPane>
      ))}
    </Tabs>
  );
}

TabbedEditor.defaultProps = defaultProps;

export default function createTabbedEditor(tabs: any) {
  return function TabbedEditorWrapper(props: any) {
    return <TabbedEditor {...props} tabs={tabs} />;
  };
}
