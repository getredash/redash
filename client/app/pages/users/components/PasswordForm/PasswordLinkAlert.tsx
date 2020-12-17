import { isString } from "lodash";
import React from "react";
import Alert from "antd/lib/alert";
import DynamicComponent from "@/components/DynamicComponent";
import InputWithCopy from "@/components/InputWithCopy";
import { UserProfile } from "@/components/proptypes";
import { absoluteUrl } from "@/services/utils";
type OwnProps = {
    user: UserProfile;
    passwordLink?: string;
};
type Props = OwnProps & typeof PasswordLinkAlert.defaultProps;
export default function PasswordLinkAlert(props: Props) {
    // @ts-expect-error ts-migrate(2700) FIXME: Rest types may only be created from object types.
    const { user, passwordLink, ...restProps } = props;
    if (!isString(passwordLink)) {
        return null;
    }
    return (<DynamicComponent name="UserProfile.PasswordLinkAlert" {...props}>
      <Alert message="Email not sent!" description={<React.Fragment>
            <p>
              The mail server is not configured, please send the following link to <b>{(user as any).name}</b>:
            </p>
            {/* @ts-expect-error ts-migrate(2322) FIXME: Type '{ value: string; readOnly: true; }' is not a... Remove this comment to see the full error message */}
            <InputWithCopy value={absoluteUrl(passwordLink)} readOnly/>
          </React.Fragment>} type="warning" className="m-t-20" closable {...restProps}/>
    </DynamicComponent>);
}
PasswordLinkAlert.defaultProps = {
    passwordLink: null,
};
