import React from 'react';
import PropTypes from 'prop-types';
import { react2angular } from 'react2angular';
import { currentUser, clientConfig } from '@/services/auth';

export function EmailSettingsWarning({ featureName }) {
  return (clientConfig.mailSettingsMissing && currentUser.isAdmin) ? (
    <p className="alert alert-danger">
      {`It looks like your mail server isn't configured. Make sure to configure it for the ${featureName} to work.`}
    </p>
  ) : null;
}

EmailSettingsWarning.propTypes = {
  featureName: PropTypes.string.isRequired,
};

export default function init(ngModule) {
  ngModule.component('emailSettingsWarning', react2angular(EmailSettingsWarning));
}

init.init = true;
