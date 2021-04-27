import React from "react";
import { ExternalIconLink } from "@/components/Link";
import { clientConfig, currentUser } from "@/services/auth";
import frontendVersion from "@/version.json";

export default function VersionInfo() {
  return (
    <React.Fragment>
      <div>
        Version: {clientConfig.version}
        {frontendVersion !== clientConfig.version && ` (${frontendVersion.substring(0, 8)})`}
      </div>
      {clientConfig.newVersionAvailable && currentUser.hasPermission("super_admin") && (
        <div className="m-t-10">
          {/* eslint-disable react/jsx-no-target-blank */}
          <ExternalIconLink href="https://version.redash.io/" className="update-available">
            Update Available
          </ExternalIconLink>
        </div>
      )}
    </React.Fragment>
  );
}
