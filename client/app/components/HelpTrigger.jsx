import React from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';
import Tooltip from 'antd/lib/tooltip';
import Drawer from 'antd/lib/drawer';
import Icon from 'antd/lib/icon';
import { BigMessage } from '@/components/BigMessage';
import DynamicComponent from '@/components/DynamicComponent';

import './HelpTrigger.less';

const DOMAIN = 'https://redash.io';
const HELP_PATH = '/help';
const IFRAME_TIMEOUT = 20000;
const IFRAME_URL_UPDATE_MESSAGE = 'iframe_url';

export const TYPES = {
  HOME: [
    '',
    'Help',
  ],
  VALUE_SOURCE_OPTIONS: [
    '/user-guide/querying/query-parameters#Value-Source-Options',
    'Guide: Value Source Options',
  ],
  SHARE_DASHBOARD: [
    '/user-guide/dashboards/sharing-dashboards',
    'Guide: Sharing and Embedding Dashboards',
  ],
  AUTHENTICATION_OPTIONS: [
    '/user-guide/users/authentication-options',
    'Guide: Authentication Options',
  ],
  USAGE_DATA_SHARING: [
    '/open-source/admin-guide/usage-data',
    'Help: Anonymous Usage Data Sharing',
  ],
  DS_ATHENA: [
    '/data-sources/amazon-athena-setup',
    'Guide: Help Setting up Amazon Athena',
  ],
  DS_BIGQUERY: [
    '/data-sources/bigquery-setup',
    'Guide: Help Setting up BigQuery',
  ],
  DS_URL: [
    '/data-sources/querying-urls',
    'Guide: Help Setting up URL',
  ],
  DS_MONGODB: [
    '/data-sources/mongodb-setup',
    'Guide: Help Setting up MongoDB',
  ],
  DS_GOOGLE_SPREADSHEETS: [
    '/data-sources/querying-a-google-spreadsheet',
    'Guide: Help Setting up Google Spreadsheets',
  ],
  DS_GOOGLE_ANALYTICS: [
    '/data-sources/google-analytics-setup',
    'Guide: Help Setting up Google Analytics',
  ],
  DS_AXIBASETSD: [
    '/data-sources/axibase-time-series-database',
    'Guide: Help Setting up Axibase Time Series',
  ],
  DS_RESULTS: [
    '/user-guide/querying/query-results-data-source',
    'Guide: Help Setting up Query Results',
  ],
  ALERT_SETUP: [
    '/user-guide/alerts/setting-up-an-alert',
    'Guide: Setting Up a New Alert',
  ],
  MAIL_CONFIG: [
    '/open-source/setup/#Mail-Configuration',
    'Guide: Mail Configuration',
  ],
  ALERT_NOTIF_TEMPLATE_GUIDE: [
    '/user-guide/alerts/custom-alert-notifications',
    'Guide: Custom Alerts Notifications',
  ],
  FAVORITES: [
    '/user-guide/querying/favorites-tagging/#Favorites',
    'Guide: Favorites',
  ],
};

export default class HelpTrigger extends React.Component {
  static propTypes = {
    type: PropTypes.oneOf(Object.keys(TYPES)).isRequired,
    className: PropTypes.string,
    children: PropTypes.node,
  };

  static defaultProps = {
    className: null,
    children: <i className="fa fa-question-circle" />,
  };

  iframeRef = null;

  iframeLoadingTimeout = null;

  constructor(props) {
    super(props);
    this.iframeRef = React.createRef();
  }

  state = {
    visible: false,
    loading: false,
    error: false,
    currentUrl: null,
  };

  componentDidMount() {
    window.addEventListener('message', this.onPostMessageReceived, DOMAIN);
  }

  componentWillUnmount() {
    window.removeEventListener('message', this.onPostMessageReceived);
    clearTimeout(this.iframeLoadingTimeout);
  }

  loadIframe = (url) => {
    clearTimeout(this.iframeLoadingTimeout);
    this.setState({ loading: true, error: false });

    this.iframeRef.current.src = url;
    this.iframeLoadingTimeout = setTimeout(() => {
      this.setState({ error: url, loading: false });
    }, IFRAME_TIMEOUT); // safety
  };

  onIframeLoaded = () => {
    this.setState({ loading: false });
    clearTimeout(this.iframeLoadingTimeout);
  };

  onPostMessageReceived = (event) => {
    const { type, message: currentUrl } = event.data || {};
    if (type !== IFRAME_URL_UPDATE_MESSAGE) {
      return;
    }

    this.setState({ currentUrl });
  }

  openDrawer = () => {
    this.setState({ visible: true });
    const [pagePath] = TYPES[this.props.type];
    const url = DOMAIN + HELP_PATH + pagePath;

    // wait for drawer animation to complete so there's no animation jank
    setTimeout(() => this.loadIframe(url), 300);
  };

  closeDrawer = (event) => {
    if (event) {
      event.preventDefault();
    }
    this.setState({ visible: false });
    this.setState({ visible: false, currentUrl: null });
  };

  render() {
    const [, tooltip] = TYPES[this.props.type];
    const className = cx('help-trigger', this.props.className);
    const url = this.state.currentUrl;

    return (
      <React.Fragment>
        <Tooltip title={tooltip}>
          <a onClick={this.openDrawer} className={className}>
            {this.props.children}
          </a>
        </Tooltip>
        <Drawer
          placement="right"
          closable={false}
          onClose={this.closeDrawer}
          visible={this.state.visible}
          className="help-drawer"
          destroyOnClose
          width={400}
        >
          <div className="drawer-wrapper">
            <div className="drawer-menu">
              {url && (
                <Tooltip title="Open page in a new window" placement="left">
                  {/* eslint-disable-next-line react/jsx-no-target-blank */}
                  <a href={url} target="_blank">
                    <i className="fa fa-external-link" />
                  </a>
                </Tooltip>
              )}
              <Tooltip title="Close" placement="bottom">
                <a href="#" onClick={this.closeDrawer}>
                  <Icon type="close" />
                </a>
              </Tooltip>
            </div>

            {/* iframe */}
            {!this.state.error && (
              <iframe
                ref={this.iframeRef}
                title="Redash Help"
                src="about:blank"
                className={cx({ ready: !this.state.loading })}
                onLoad={this.onIframeLoaded}
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
                <a href={this.state.error} target="_blank" rel="noopener">Click here</a>{' '}
                to open the page in a new window.
              </BigMessage>
            )}
          </div>

          {/* extra content */}
          <DynamicComponent
            name="HelpDrawerExtraContent"
            onLeave={this.closeDrawer}
            openPageUrl={this.loadIframe}
          />
        </Drawer>
      </React.Fragment>
    );
  }
}
