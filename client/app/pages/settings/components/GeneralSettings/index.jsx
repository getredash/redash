import React from "react";
import DynamicComponent from "@/components/DynamicComponent";

import FormatSettings from "./FormatSettings";
import PlotlySettings from "./PlotlySettings";
import FeatureFlagsSettings from "./FeatureFlagsSettings";

export default function GeneralSettings(props) {
  return (
    <DynamicComponent name="OrganizationSettings.GeneralSettings" {...props}>
      <h3 className="m-t-0">General</h3>
      <hr />
      <FormatSettings {...props} />
      <PlotlySettings {...props} />
      <FeatureFlagsSettings {...props} />
    </DynamicComponent>
  );
}
