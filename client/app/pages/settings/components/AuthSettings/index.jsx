import React from "react";
import HelpTrigger from "@/components/HelpTrigger";

import PasswordLoginSettings from "./PasswordLoginSettings";
import GoogleLoginSettings from "./GoogleLoginSettings";
import SAMLSettings from "./SAMLSettings";

export default function AuthSettings(props) {
  return (
    <React.Fragment>
      <h3 className="m-t-0">
        Authentication <HelpTrigger type="AUTHENTICATION_OPTIONS" />
      </h3>
      <hr />
      <PasswordLoginSettings {...props} />
      <GoogleLoginSettings {...props} />
      <SAMLSettings {...props} />
    </React.Fragment>
  );
}
