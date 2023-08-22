import React from "react";
import Popover from "antd/lib/popover";
import QuestionCircleFilledIcon from "@ant-design/icons/QuestionCircleFilled";
import { visualizationsSettings } from "@/visualizations/visualizationsSettings";

import "./context-help.less";

type OwnContextHelpProps = {
  icon?: React.ReactNode;
  children?: React.ReactNode;
};

type ContextHelpProps = OwnContextHelpProps & typeof ContextHelp.defaultProps;

export default function ContextHelp({ icon, children, ...props }: ContextHelpProps) {
  return (
    <Popover {...props} content={children}>
      {icon || ContextHelp.defaultIcon}
    </Popover>
  );
}

ContextHelp.defaultProps = {
  icon: null,
  children: null,
};

ContextHelp.defaultIcon = <QuestionCircleFilledIcon className="context-help-default-icon" />;

function NumberFormatSpecs() {
  const { HelpTriggerComponent } = visualizationsSettings;
  return (
    <HelpTriggerComponent
      // @ts-expect-error ts-migrate(2322) FIXME: Type '{ children: Element; type: string; title: st... Remove this comment to see the full error message
      type="NUMBER_FORMAT_SPECS"
      title="Formatting Numbers"
      href="https://redash.io/help/user-guide/visualizations/formatting-numbers"
      className="visualization-editor-context-help">
      {ContextHelp.defaultIcon}
    </HelpTriggerComponent>
  );
}

function DateTimeFormatSpecs() {
  const { HelpTriggerComponent } = visualizationsSettings;
  return (
    <HelpTriggerComponent
      title="Formatting Dates and Times"
      href="https://momentjs.com/docs/#/displaying/format/"
      className="visualization-editor-context-help">
      {ContextHelp.defaultIcon}
    </HelpTriggerComponent>
  );
}

function TickFormatSpecs() {
  const { HelpTriggerComponent } = visualizationsSettings;
  return (
    <HelpTriggerComponent
      title="Tick Formatting"
      href="https://redash.io/help/user-guide/visualizations/formatting-axis"
      className="visualization-editor-context-help">
      {ContextHelp.defaultIcon}
    </HelpTriggerComponent>
  );
}

ContextHelp.NumberFormatSpecs = NumberFormatSpecs;
ContextHelp.DateTimeFormatSpecs = DateTimeFormatSpecs;
ContextHelp.TickFormatSpecs = TickFormatSpecs;
