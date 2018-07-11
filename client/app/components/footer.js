import React from 'react';
import { react2angular } from 'react2angular';

class Footer extends React.Component {
  render() {
    const version = this.props.clientConfig.version;
    const newVersionAvailable = this.props.clientConfig.newVersionAvailable && this.props.currentUser.isAdmin;
    return (
      <div id="footer">
        <a href="http://redash.io">Redash</a> {version}{ <small><a href="https://version.redash.io/">(New Redash version available)</a></small> ? newVersionAvailable : ''}
        &#8226;
        <a href="https://redash.io/help/">Documentation</a>
        &#8226;
        <a href="http://github.com/getredash/redash">Contribute</a>
      </div>
    );
  }
}

export default function init(ngModule) {
  ngModule.component('footer', react2angular(Footer, [], ['clientConfig', 'currentUser']));
}
