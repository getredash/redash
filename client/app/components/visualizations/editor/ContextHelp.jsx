import React from "react";
import PropTypes from "prop-types";
import Popover from "antd/lib/popover";
import Tooltip from "antd/lib/tooltip";
import Icon from "antd/lib/icon";
import HelpTrigger from "@/components/HelpTrigger";

import "./context-help.less";

export default function ContextHelp({ icon, children, ...props }) {
  return (
    <Popover {...props} content={children}>
      {icon || ContextHelp.defaultIcon}
    </Popover>
  );
}

ContextHelp.propTypes = {
  icon: PropTypes.node,
  children: PropTypes.node,
};

ContextHelp.defaultProps = {
  icon: null,
  children: null,
};

ContextHelp.defaultIcon = <Icon className="m-l-5 m-r-5" type="question-circle" theme="filled" />;

function NumberFormatSpecs() {
  return (
    <HelpTrigger type="NUMBER_FORMAT_SPECS" className="visualization-editor-context-help">
      {ContextHelp.defaultIcon}
    </HelpTrigger>
  );
}

function DateTimeFormatSpecs() {
  return (
    <Tooltip
      title={
        <React.Fragment>
          Formatting Dates and Times
          <i className="fa fa-external-link m-l-5" />
        </React.Fragment>
      }>
      <a
        className="visualization-editor-context-help"
        href="https://momentjs.com/docs/#/displaying/format/"
        target="_blank"
        rel="noopener noreferrer">
        {ContextHelp.defaultIcon}
      </a>
    </Tooltip>
  );
}

ContextHelp.NumberFormatSpecs = NumberFormatSpecs;
ContextHelp.DateTimeFormatSpecs = DateTimeFormatSpecs;
