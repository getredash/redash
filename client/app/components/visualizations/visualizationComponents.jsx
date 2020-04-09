import React from "react";
import HelpTrigger from "@/components/HelpTrigger";
import { getCustomizedComponents } from "@/visualizations/components";
import { ContextHelp } from "@/components/visualizations/editor";

const NumberFormatSpecs = (
  <HelpTrigger type="NUMBER_FORMAT_SPECS" className="visualization-editor-context-help">
    {ContextHelp.defaultIcon}
  </HelpTrigger>
);

export const { Renderer, Editor } = getCustomizedComponents({ NumberFormatSpecs });
