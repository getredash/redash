import React from "react";

import FormatSettings from "./FormatSettings";
import PlotlySettings from "./PlotlySettings";
import FeaturesSettings from "./FeaturesSettings";
import BeaconConsentSettings from "./BeaconConsentSettings";

export default function GeneralSettings(props) {
  return (
    <React.Fragment>
      <h3 className="m-t-0">General</h3>
      <hr />
      <FormatSettings {...props} />
      <PlotlySettings {...props} />
      <FeaturesSettings {...props} />
      <BeaconConsentSettings {...props} />
    </React.Fragment>
  );
}
