import React from "react";
import HelpTrigger from "@/components/HelpTrigger";
import { Renderer, Editor, updateVisualizationsSettings } from "@/visualizations/components";
import { ContextHelp } from "@/components/visualizations/editor";

const NumberFormatSpecs = (
  <HelpTrigger type="NUMBER_FORMAT_SPECS" className="visualization-editor-context-help">
    {ContextHelp.defaultIcon}
  </HelpTrigger>
);

updateVisualizationsSettings({ NumberFormatSpecs });

export { Renderer, Editor };
