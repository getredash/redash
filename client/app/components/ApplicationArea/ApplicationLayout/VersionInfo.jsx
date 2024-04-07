import React from "react";
import { clientConfig } from "@/services/auth";
import frontendVersion from "@/version.json";

export default function VersionInfo() {
  return (
    <React.Fragment>
      <div>
        Version: {clientConfig.version}
        {frontendVersion !== clientConfig.version && ` (${frontendVersion.substring(0, 8)})`}
      </div>
    </React.Fragment>
  );
}
