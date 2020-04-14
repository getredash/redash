import React from "react";
import HelpTrigger from "@/components/HelpTrigger";
import { Renderer as VisRenderer, Editor as VisEditor } from "@/visualizations";
import { updateVisualizationsSettings } from "@/visualizations/visualizationsSettings";
import { clientConfig } from "@/services/auth";

function wrapComponentWithSettings(WrappedComponent) {
  return function VisualizationComponent(props) {
    updateVisualizationsSettings({
      HelpTriggerComponent: HelpTrigger,
      dateFormat: clientConfig.dateFormat,
      dateTimeFormat: clientConfig.dateTimeFormat,
      integetFormat: clientConfig.integetFormat,
      floatFormat: clientConfig.floatFormat,
      booleanValues: clientConfig.booleanValues,
      tableCellMaxJSONSize: clientConfig.tableCellMaxJSONSize,
      allowCustomJSVisualization: clientConfig.allowCustomJSVisualization,
      hidePlotlyModeBar: clientConfig.hidePlotlyModeBar,
    });

    return <WrappedComponent {...props} />;
  };
}

export const Renderer = wrapComponentWithSettings(VisRenderer);
export const Editor = wrapComponentWithSettings(VisEditor);
