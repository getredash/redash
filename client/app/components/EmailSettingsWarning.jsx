import React from 'react';
import PropTypes from 'prop-types';
import { clientConfig } from '@/services/auth';
import Tooltip from 'antd/lib/tooltip';
// import { HelpTrigger } from '@/components/HelpTrigger';

export default function EmailSettingsWarning({ featureName, className }) {
  if (!clientConfig.mailSettingsMissing) {
    return null;
  }

  const title = (
    <span>Your mail server isn&apos;t configured correctly, and is needed for {featureName} to work.</span>
  );

  return (
    <Tooltip title={title}>
      <i className={`fa fa-exclamation-triangle ${className}`} />
    </Tooltip>
  );
}

EmailSettingsWarning.propTypes = {
  featureName: PropTypes.string.isRequired,
  className: PropTypes.string,
};

EmailSettingsWarning.defaultProps = {
  className: null,
};
