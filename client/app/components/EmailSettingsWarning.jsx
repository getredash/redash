import React from "react";
import PropTypes from "prop-types";
import { clientConfig, currentUser } from "@/services/auth";
import Tooltip from "antd/lib/tooltip";
import Alert from "antd/lib/alert";
import HelpTrigger from "@/components/HelpTrigger";

export default function EmailSettingsWarning({ featureName, className, mode, adminOnly }) {
  if (!clientConfig.mailSettingsMissing) {
    return null;
  }

  if (adminOnly && !currentUser.isAdmin) {
    return null;
  }

  const message = (
    <span id="sr-mail-description">
      Your mail server isn&apos;t configured correctly, and is needed for {featureName} to work.{" "}
      <HelpTrigger type="MAIL_CONFIG" className="f-inherit" />
    </span>
  );

  if (mode === "icon") {
    return (
      <Tooltip title={message} placement="topRight" arrowPointAtCenter>
        <span className={className} aria-label="Mail alert" aria-describedby="sr-mail-description" tabIndex={0}>
          <i className={"fa fa-exclamation-triangle"} aria-hidden="true" />
        </span>
      </Tooltip>
    );
  }

  return <Alert message={message} type="error" className={className} />;
}

EmailSettingsWarning.propTypes = {
  featureName: PropTypes.string.isRequired,
  className: PropTypes.string,
  mode: PropTypes.oneOf(["alert", "icon"]),
  adminOnly: PropTypes.bool,
};

EmailSettingsWarning.defaultProps = {
  className: null,
  mode: "alert",
  adminOnly: false,
};
