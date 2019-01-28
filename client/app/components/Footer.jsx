import React from 'react';
import { react2angular } from 'react2angular';
import { clientConfig, currentUser } from '@/services/auth';

import frontendVersion from '../version.json';

export function Footer() {
  const backendVersion = clientConfig.version;
  const newVersionAvailable = clientConfig.newVersionAvailable && currentUser.isAdmin;
  const separator = ' \u2022 ';

  let newVersionString = '';
  if (newVersionAvailable) {
    newVersionString = (
      <small>
        <a href="https://version.redash.io/">(New Redash version available)</a>
      </small>
    );
  }

  return (
    <div id="footer">
      <a href="https://redash.io">Redash</a> {backendVersion} ({frontendVersion.substring(0, 8)})
      {newVersionString}
      {separator}
      <a href="https://redash.io/help/">Documentation</a>
      {separator}
      <a href="https://github.com/getredash/redash">Contribute</a>
    </div>
  );
}

export default function init(ngModule) {
  ngModule.component('footer', react2angular(Footer));
}

init.init = true;
