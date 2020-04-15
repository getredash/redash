import React from "react";
import { pick } from "lodash";
import HelpTrigger from "@/components/HelpTrigger";
import { Renderer as VisRenderer, Editor as VisEditor } from "@/visualizations";
import { updateVisualizationsSettings } from "@/visualizations/visualizationsSettings";
import { clientConfig } from "@/services/auth";

import countriesDataUrl from "@/visualizations/choropleth/maps/countries.geo.json";
import subdivJapanDataUrl from "@/visualizations/choropleth/maps/japan.prefectures.geo.json";

function wrapComponentWithSettings(WrappedComponent) {
  return function VisualizationComponent(props) {
    updateVisualizationsSettings({
      HelpTriggerComponent: HelpTrigger,
      choroplethAvailableMaps: {
        countries: {
          name: "Countries",
          url: countriesDataUrl,
        },
        subdiv_japan: {
          name: "Japan/Prefectures",
          url: subdivJapanDataUrl,
        },
      },
      ...pick(clientConfig, [
        "dateFormat",
        "dateTimeFormat",
        "integerFormat",
        "floatFormat",
        "booleanValues",
        "tableCellMaxJSONSize",
        "allowCustomJSVisualization",
        "hidePlotlyModeBar",
      ]),
    });

    return <WrappedComponent {...props} />;
  };
}

export const Renderer = wrapComponentWithSettings(VisRenderer);
export const Editor = wrapComponentWithSettings(VisEditor);
