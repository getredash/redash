import React from "react";
import Link from "@/components/Link";
import { clientConfig, currentUser } from "@/services/auth";
// @ts-expect-error ts-migrate(7042) FIXME: Module '@/version.json' was resolved to '/Users/el... Remove this comment to see the full error message
import frontendVersion from "@/version.json";

export default function VersionInfo() {
  return (
    <React.Fragment>
      <div>
        {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'version' does not exist on type '{}'. */}
        Version: {clientConfig.version}
        {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'version' does not exist on type '{}'. */}
        {frontendVersion !== clientConfig.version && ` (${frontendVersion.substring(0, 8)})`}
      </div>
      {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'newVersionAvailable' does not exist on t... Remove this comment to see the full error message */}
      {clientConfig.newVersionAvailable && currentUser.hasPermission("super_admin") && (
        <div className="m-t-10">
          {/* eslint-disable react/jsx-no-target-blank */}
          <Link href="https://version.redash.io/" className="update-available" target="_blank" rel="noopener">
            Update Available
            <i className="fa fa-external-link m-l-5" />
          </Link>
        </div>
      )}
    </React.Fragment>
  );
}
