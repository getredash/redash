import React from "react";
import Link from "@/components/Link";
import { clientConfig, currentUser } from "@/services/auth";
// @ts-expect-error ts-migrate(7042) FIXME: Module '@/version.json' was resolved to '/Users/el... Remove this comment to see the full error message
import frontendVersion from "@/version.json";
export default function VersionInfo() {
    return (<React.Fragment>
      <div>
        Version: {(clientConfig as any).version}
        {frontendVersion !== (clientConfig as any).version && ` (${frontendVersion.substring(0, 8)})`}
      </div>
      {(clientConfig as any).newVersionAvailable && currentUser.hasPermission("super_admin") && (<div className="m-t-10">
          
          <Link href="https://version.redash.io/" className="update-available" target="_blank" rel="noopener">
            Update Available
            <i className="fa fa-external-link m-l-5"/>
          </Link>
        </div>)}
    </React.Fragment>);
}
