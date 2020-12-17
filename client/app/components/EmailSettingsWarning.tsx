import React from "react";
import cx from "classnames";
import { clientConfig, currentUser } from "@/services/auth";
import Tooltip from "antd/lib/tooltip";
import Alert from "antd/lib/alert";
import HelpTrigger from "@/components/HelpTrigger";
type OwnProps = {
    featureName: string;
    className?: string;
    mode?: "alert" | "icon";
    adminOnly?: boolean;
};
type Props = OwnProps & typeof EmailSettingsWarning.defaultProps;
export default function EmailSettingsWarning({ featureName, className, mode, adminOnly }: Props) {
    if (!(clientConfig as any).mailSettingsMissing) {
        return null;
    }
    if (adminOnly && !currentUser.isAdmin) {
        return null;
    }
    const message = (<span>
      Your mail server isn&apos;t configured correctly, and is needed for {featureName} to work.{" "}
      {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'. */}
      <HelpTrigger type="MAIL_CONFIG" className="f-inherit"/>
    </span>);
    if (mode === "icon") {
        return (<Tooltip title={message}>
        <i className={cx("fa fa-exclamation-triangle", className)}/>
      </Tooltip>);
    }
    return <Alert message={message} type="error" className={className}/>;
}
EmailSettingsWarning.defaultProps = {
    className: null,
    mode: "alert",
    adminOnly: false,
};
