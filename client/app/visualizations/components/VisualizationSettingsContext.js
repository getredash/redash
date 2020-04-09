import React, { useContext, useMemo } from "react";

const defaultSettings = {
  NumberFormatSpecs: null,
};

const VisualizationSettingsContext = React.createContext(defaultSettings);
export default VisualizationSettingsContext;

export function useVisualizationSettingsContext() {
  const visualizationSettings = useContext(VisualizationSettingsContext);
  return useMemo(() => ({ ...defaultSettings, ...visualizationSettings }), [visualizationSettings]);
}
