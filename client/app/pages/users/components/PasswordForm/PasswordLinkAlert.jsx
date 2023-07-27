import { isString } from "lodash";
import React from "react";
import PropTypes from "prop-types";
import Alert from "antd/lib/alert";
import DynamicComponent from "@/components/DynamicComponent";
import InputWithCopy from "@/components/InputWithCopy";
import { UserProfile } from "@/components/proptypes";
import { absoluteUrl } from "@/services/utils";

export default function PasswordLinkAlert(props) {
  const { user, passwordLink, ...restProps } = props;

  if (!isString(passwordLink)) {
    return null;
  }

  return (
    <DynamicComponent name="UserProfile.PasswordLinkAlert" {...props}>
      <Alert
        message="Email not sent!"
        description={
          <React.Fragment>
            <p>
              The mail server is not configured, please send the following link to <b>{user.name}</b>:
            </p>
            <InputWithCopy value={absoluteUrl(passwordLink)} aria-label="Password link" readOnly />
          </React.Fragment>
        }
        type="warning"
        className="m-t-20"
        closable
        {...restProps}
      />
    </DynamicComponent>
  );
}

PasswordLinkAlert.propTypes = {
  user: UserProfile.isRequired,
  passwordLink: PropTypes.string,
};

PasswordLinkAlert.defaultProps = {
  passwordLink: null,
};
