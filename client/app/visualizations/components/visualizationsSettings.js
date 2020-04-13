import React from "react";
import { extend } from "lodash";
import Icon from "antd/lib/icon";
import Tooltip from "antd/lib/tooltip";

export const visualizationsSettings = {
  NumberFormatSpecs: (
    <Tooltip
      title={
        <React.Fragment>
          Formatting Numbers
          <i className="fa fa-external-link m-l-5" />
        </React.Fragment>
      }>
      <a
        className="visualization-editor-context-help"
        href="https://redash.io/help/user-guide/visualizations/formatting-numbers"
        target="_blank"
        rel="noopener noreferrer">
        <Icon className="m-l-5 m-r-5" type="question-circle" theme="filled" />
      </a>
    </Tooltip>
  ),
};

export function updateVisualizationsSettings(options) {
  extend(visualizationsSettings, options);
}
