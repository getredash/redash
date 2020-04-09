import React from "react";
import Renderer from "./Renderer";
import Editor from "./Editor";
import VisualizationSettingsContext from "./VisualizationSettingsContext";

function wrapComponentWithOptions(options, WrappedComponent) {
  return function(props) {
    return (
      <VisualizationSettingsContext.Provider value={options}>
        <WrappedComponent {...props} />
      </VisualizationSettingsContext.Provider>
    );
  };
}

function getCustomizedComponents(options) {
  return { Renderer: wrapComponentWithOptions(options, Renderer), Editor: wrapComponentWithOptions(options, Editor) };
}

export { Renderer, Editor, getCustomizedComponents };
