import React from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';
import Tooltip from 'antd/lib/tooltip';
import Icon from 'antd/lib/icon';
import Drawer from 'antd/lib/drawer';
import { BigMessage } from '@/components/BigMessage';

import './HelpTrigger.less';

const DOMAIN = 'https://redash.io';
const HELP_PATH = '/help/user-guide/';
const MESSAGES = {
  HELP_DRAWER_READY: 'drawer_ready',
  HELP_DRAWER_REQUEST: 'drawer_request',
};
const IFRAME_TIMEOUT = 5000;
const TYPES = {
  VALUE_SOURCE_OPTIONS: [
    'querying/query-parameters#Value-Source-Options',
    'Value Source Options',
  ],
  SHARE_DASHBOARD: [
    'dashboards/sharing-dashboards',
    'Sharing and Embedding Dashboards',
  ],
};

export default class HelpTrigger extends React.PureComponent {
  static propTypes = {
    type: PropTypes.oneOf(Object.keys(TYPES)).isRequired,
  }

  iframeRef = null

  iframeLoadingTimeout = null;

  constructor(props) {
    super(props);
    this.iframeRef = React.createRef();
  }

  state = {
    visible: false,
    loading: false,
    error: false,
  }

  componentWillUnmount() {
    this.removeIframeListeners();
  }

  get helpUrl() {
    const [pagePath] = TYPES[this.props.type];
    return DOMAIN + HELP_PATH + pagePath;
  }

  onIframeLoaded = () => {
    const { contentWindow } = this.iframeRef.current;
    contentWindow.postMessage(MESSAGES.HELP_DRAWER_REQUEST, DOMAIN);
  }

  onIframeError = () => {
    this.setState({ error: true, loading: false });
  }

  onIframeReady = () => {
    this.setState({ loading: false });
    this.removeIframeListeners();
  }

  onPostMessageReceived = (event) => {
    if (event.origin === DOMAIN && event.data === MESSAGES.HELP_DRAWER_READY) {
      this.onIframeReady();
    }
  }

  openDrawer = () => {
    this.setState({ visible: true, loading: true, error: false });
    setTimeout(this.onDrawerOpened, 300); // to prevent animation jank
  }

  closeDrawer = () => {
    this.setState({ visible: false });
    this.removeIframeListeners();
  }

  onDrawerOpened = () => {
    this.addIframeListeners();
    this.iframeRef.current.src = this.helpUrl;
  }

  addIframeListeners = () => {
    window.addEventListener('message', this.onPostMessageReceived, DOMAIN);
    this.iframeRef.current.addEventListener('load', this.onIframeLoaded);
    this.iframeLoadingTimeout = setTimeout(this.onIframeError, IFRAME_TIMEOUT);
  }

  removeIframeListeners = () => {
    window.removeEventListener('message', this.onPostMessageReceived);
    this.iframeRef.current.removeEventListener('load', this.onIframeLoaded);
    window.clearTimeout(this.iframeLoadingTimeout);
  }

  render() {
    const [, tooltip] = TYPES[this.props.type];

    return (
      <React.Fragment>
        <Tooltip title={`Guide: ${tooltip}`}>
          <a href="javascript: void(0)" onClick={this.openDrawer}>
            <Icon type="question-circle" />
          </a>
        </Tooltip>
        <Drawer
          placement="right"
          onClose={this.closeDrawer}
          visible={this.state.visible}
          className="help-drawer"
          destroyOnClose
          width={450}
        >
          {/* iframe */}
          {!this.state.error && (
            <iframe
              ref={this.iframeRef}
              title="Redash Help"
              src="about:blank"
              className={cx({ ready: !this.state.loading })}
            />
          )}

          {/* loading indicator */}
          {this.state.loading && (
            <BigMessage icon="fa-spinner fa-2x fa-pulse" message="Loading..." className="help-message" />
          )}

          {/* error message */}
          {this.state.error && (
            <BigMessage icon="fa-exclamation-circle" className="help-message">
              Something went wrong.<br />
              {/* eslint-disable-next-line react/jsx-no-target-blank */}
              <a href={this.helpUrl + '?s=help_error'} target="_blank" rel="noopener">Click here</a>{' '}
              to open the document in a new window.
            </BigMessage>
          )}
        </Drawer>
      </React.Fragment>
    );
  }
}
