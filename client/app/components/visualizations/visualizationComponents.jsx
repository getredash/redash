import React from "react";
import HelpTrigger from "@/components/HelpTrigger";
import { Renderer, Editor } from "@/visualizations/components";
import { updateVisualizationsSettings } from "@/visualizations/components/visualizationsSettings";
import { ContextHelp } from "@/components/visualizations/editor";

const NumberFormatSpecs = (
  <HelpTrigger type="NUMBER_FORMAT_SPECS" className="visualization-editor-context-help">
    {ContextHelp.defaultIcon}
  </HelpTrigger>
);

updateVisualizationsSettings({ NumberFormatSpecs });

export { Renderer, Editor };
