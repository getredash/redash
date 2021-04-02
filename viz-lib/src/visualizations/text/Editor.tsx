import React from "react";
import { Section, Select, TextArea } from "@/components/visualizations/editor";
import createTabbedEditor from "@/components/visualizations/editor/createTabbedEditor";

//import GeneralSettings from "./GeneralSettings";
//import FormatSettings from "./FormatSettings";

function TextSettings({ options, data, onOptionsChange }: any) {
  return (
    <React.Fragment>
      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        <TextArea
          layout="vertical"
          label="Text"
          autoSize={ true }
          defaultValue={options.template}
          onChange={(e: any) => onOptionsChange({ template: e.target.value })}
        />
      </Section>

    </React.Fragment>
  );
}

export default createTabbedEditor([
  { key: "General", title: "General", component: TextSettings },
//  { key: "Format", title: "Format", component: FormatSettings },
]);

