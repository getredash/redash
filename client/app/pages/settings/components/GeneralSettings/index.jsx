import React from "react";
import DynamicComponent from "@/components/DynamicComponent";
import LogoSettings from "./LogoSettings";
import FormatSettings from "./FormatSettings";
import PlotlySettings from "./PlotlySettings";
import FeatureFlagsSettings from "./FeatureFlagsSettings";
import BeaconConsentSettings from "./BeaconConsentSettings";

export default function GeneralSettings(props) {
  return (
    <DynamicComponent name="OrganizationSettings.GeneralSettings" {...props}>
      <h3 className="m-t-0">General</h3>
      <hr />
      <LogoSettings {...props} />
      <FormatSettings {...props} />
      <PlotlySettings {...props} />
      <FeatureFlagsSettings {...props} />
      <BeaconConsentSettings {...props} />
    </DynamicComponent>
  );
}
