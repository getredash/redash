import { startsWith, get, some, mapValues } from "lodash";
import React from "react";
import PropTypes from "prop-types";
import cx from "classnames";
import Tooltip from "antd/lib/tooltip";
import Drawer from "antd/lib/drawer";
import Link from "@/components/Link";
import CloseOutlinedIcon from "@ant-design/icons/CloseOutlined";
import BigMessage from "@/components/BigMessage";
import DynamicComponent, { registerComponent } from "@/components/DynamicComponent";
import "./HelpTrigger.less";
const DOMAIN = "https://redash.io";
const HELP_PATH = "/help";
const IFRAME_TIMEOUT = 20000;
const IFRAME_URL_UPDATE_MESSAGE = "iframe_url";
export const TYPES = mapValues({
    HOME: ["", "Help"],
    VALUE_SOURCE_OPTIONS: ["/user-guide/querying/query-parameters#Value-Source-Options", "Guide: Value Source Options"],
    SHARE_DASHBOARD: ["/user-guide/dashboards/sharing-dashboards", "Guide: Sharing and Embedding Dashboards"],
    AUTHENTICATION_OPTIONS: ["/user-guide/users/authentication-options", "Guide: Authentication Options"],
    USAGE_DATA_SHARING: ["/open-source/admin-guide/usage-data", "Help: Anonymous Usage Data Sharing"],
    DS_ATHENA: ["/data-sources/amazon-athena-setup", "Guide: Help Setting up Amazon Athena"],
    DS_BIGQUERY: ["/data-sources/bigquery-setup", "Guide: Help Setting up BigQuery"],
    DS_URL: ["/data-sources/querying-urls", "Guide: Help Setting up URL"],
    DS_MONGODB: ["/data-sources/mongodb-setup", "Guide: Help Setting up MongoDB"],
    DS_GOOGLE_SPREADSHEETS: [
        "/data-sources/querying-a-google-spreadsheet",
        "Guide: Help Setting up Google Spreadsheets",
    ],
    DS_GOOGLE_ANALYTICS: ["/data-sources/google-analytics-setup", "Guide: Help Setting up Google Analytics"],
    DS_AXIBASETSD: ["/data-sources/axibase-time-series-database", "Guide: Help Setting up Axibase Time Series"],
    DS_RESULTS: ["/user-guide/querying/query-results-data-source", "Guide: Help Setting up Query Results"],
    ALERT_SETUP: ["/user-guide/alerts/setting-up-an-alert", "Guide: Setting Up a New Alert"],
    MAIL_CONFIG: ["/open-source/setup/#Mail-Configuration", "Guide: Mail Configuration"],
    ALERT_NOTIF_TEMPLATE_GUIDE: ["/user-guide/alerts/custom-alert-notifications", "Guide: Custom Alerts Notifications"],
    FAVORITES: ["/user-guide/querying/favorites-tagging/#Favorites", "Guide: Favorites"],
    MANAGE_PERMISSIONS: [
        "/user-guide/querying/writing-queries#Managing-Query-Permissions",
        "Guide: Managing Query Permissions",
    ],
    NUMBER_FORMAT_SPECS: ["/user-guide/visualizations/formatting-numbers", "Formatting Numbers"],
    GETTING_STARTED: ["/user-guide/getting-started", "Guide: Getting Started"],
    DASHBOARDS: ["/user-guide/dashboards", "Guide: Dashboards"],
    QUERIES: ["/help/user-guide/querying", "Guide: Queries"],
    ALERTS: ["/user-guide/alerts", "Guide: Alerts"],
}, ([url, title]) => [DOMAIN + HELP_PATH + url, title]);
type OwnProps = {
    type?: string;
    href?: string;
    title?: React.ReactNode;
    className?: string;
    showTooltip?: boolean;
    renderAsLink?: boolean;
    children?: React.ReactNode;
};
const HelpTriggerPropTypes = {
  type: PropTypes.string,
  href: PropTypes.string,
  title: PropTypes.node,
  className: PropTypes.string,
  showTooltip: PropTypes.bool,
  renderAsLink: PropTypes.bool,
  children: PropTypes.node,
};

const HelpTriggerDefaultProps = {
    type: null,
    href: null,
    title: null,
    className: null,
    showTooltip: true,
    renderAsLink: false,
    children: <i className="fa fa-question-circle"/>,
};
export function helpTriggerWithTypes(types: any, allowedDomains = [], drawerClassName = null) {
    return class HelpTrigger extends React.Component {
        static propTypes = {
            ...HelpTriggerPropTypes,
            type: PropTypes.oneOf(Object.keys(types)),
        };
        static defaultProps = HelpTriggerDefaultProps;
        iframeRef = React.createRef();
        iframeLoadingTimeout = null;
        state = {
            visible: false,
            loading: false,
            error: false,
            currentUrl: null,
        };
        componentDidMount() {
            window.addEventListener("message", this.onPostMessageReceived, false);
        }
        componentWillUnmount() {
            window.removeEventListener("message", this.onPostMessageReceived);
            // @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call.
            clearTimeout(this.iframeLoadingTimeout);
        }
        loadIframe = (url: any) => {
            // @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call.
            clearTimeout(this.iframeLoadingTimeout);
            this.setState({ loading: true, error: false });
            // @ts-expect-error ts-migrate(2571) FIXME: Object is of type 'unknown'.
            this.iframeRef.current.src = url;
            // @ts-expect-error ts-migrate(2322) FIXME: Type 'number' is not assignable to type 'null'.
            this.iframeLoadingTimeout = setTimeout(() => {
                this.setState({ error: url, loading: false });
            }, IFRAME_TIMEOUT); // safety
        };
        onIframeLoaded = () => {
            this.setState({ loading: false });
            // @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call.
            clearTimeout(this.iframeLoadingTimeout);
        };
        onPostMessageReceived = (event: any) => {
            if (!some(allowedDomains, domain => startsWith(event.origin, domain))) {
                return;
            }
            const { type, message: currentUrl } = event.data || {};
            if (type !== IFRAME_URL_UPDATE_MESSAGE) {
                return;
            }
            this.setState({ currentUrl });
        };
        getUrl = () => {
            const helpTriggerType = get(types, (this.props as any).type);
            return helpTriggerType ? helpTriggerType[0] : (this.props as any).href;
        };
        openDrawer = (e: any) => {
            // keep "open in new tab" behavior
            if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                this.setState({ visible: true });
                // wait for drawer animation to complete so there's no animation jank
                setTimeout(() => this.loadIframe(this.getUrl()), 300);
            }
        };
        closeDrawer = (event: any) => {
            if (event) {
                event.preventDefault();
            }
            this.setState({ visible: false });
            this.setState({ visible: false, currentUrl: null });
        };
        render() {
            const targetUrl = this.getUrl();
            if (!targetUrl) {
                return null;
            }
            const tooltip = get(types, `${(this.props as any).type}[1]`, (this.props as any).title);
            const className = cx("help-trigger", (this.props as any).className);
            const url = this.state.currentUrl;
            const isAllowedDomain = some(allowedDomains, domain => startsWith(url || targetUrl, domain));
            const shouldRenderAsLink = (this.props as any).renderAsLink || !isAllowedDomain;
            return (<React.Fragment>
          <Tooltip title={(this.props as any).showTooltip ? (<>
                  {tooltip}
                  {shouldRenderAsLink && <i className="fa fa-external-link" style={{ marginLeft: 5 }}/>}
                </>) : null}>
            <Link href={url || this.getUrl()} className={className} rel="noopener noreferrer" target="_blank" onClick={shouldRenderAsLink ? () => { } : this.openDrawer}>
              {this.props.children}
            </Link>
          </Tooltip>
          <Drawer placement="right" closable={false} onClose={this.closeDrawer} visible={this.state.visible} className={cx("help-drawer", drawerClassName)} destroyOnClose width={400}>
            <div className="drawer-wrapper">
              <div className="drawer-menu">
                {url && (<Tooltip title="Open page in a new window" placement="left">
                    
                    <Link href={url} target="_blank">
                      <i className="fa fa-external-link"/>
                    </Link>
                  </Tooltip>)}
                <Tooltip title="Close" placement="bottom">
                  <a onClick={this.closeDrawer}>
                    <CloseOutlinedIcon />
                  </a>
                </Tooltip>
              </div>

              
              {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'RefObject<unknown>' is not assignable to typ... Remove this comment to see the full error message */}
              {!this.state.error && (<iframe ref={this.iframeRef} title="Usage Help" src="about:blank" className={cx({ ready: !this.state.loading })} onLoad={this.onIframeLoaded}/>)}

              
              {this.state.loading && (<BigMessage icon="fa-spinner fa-2x fa-pulse" message="Loading..." className="help-message"/>)}

              
              {/* @ts-expect-error ts-migrate(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message */}
              {this.state.error && (<BigMessage icon="fa-exclamation-circle" className="help-message">
                  Something went wrong.
                  <br />
                  
                  <Link href={this.state.error} target="_blank" rel="noopener">
                    Click here
                  </Link>{" "}
                  to open the page in a new window.
                </BigMessage>)}
            </div>

            
            {/* @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call. */}
            <DynamicComponent name="HelpDrawerExtraContent" onLeave={this.closeDrawer} openPageUrl={this.loadIframe}/>
          </Drawer>
        </React.Fragment>);
        }
    };
}
// @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'.
registerComponent("HelpTrigger", helpTriggerWithTypes(TYPES, [DOMAIN]));
type Props = OwnProps & typeof HelpTriggerDefaultProps;
export default function HelpTrigger(props: Props) {
    return <DynamicComponent {...props} name="HelpTrigger"/>;
}
HelpTrigger.defaultProps = HelpTriggerDefaultProps;
