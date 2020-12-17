import { without, find, includes, map, toLower } from "lodash";
import React from "react";
import Link from "@/components/Link";
import SelectItemsDialog from "@/components/SelectItemsDialog";
import { Destination as DestinationType, UserProfile as UserType } from "@/components/proptypes";
import DestinationService, { IMG_ROOT } from "@/services/destination";
import AlertSubscription from "@/services/alert-subscription";
import { clientConfig, currentUser } from "@/services/auth";
import notification from "@/services/notification";
import ListItemAddon from "@/components/groups/ListItemAddon";
import EmailSettingsWarning from "@/components/EmailSettingsWarning";
import CloseOutlinedIcon from "@ant-design/icons/CloseOutlined";
import Tooltip from "antd/lib/tooltip";
import Switch from "antd/lib/switch";
import Button from "antd/lib/button";
import "./AlertDestinations.less";
const USER_EMAIL_DEST_ID = -1;
function normalizeSub(sub: any) {
    if (!sub.destination) {
        sub.destination = {
            id: USER_EMAIL_DEST_ID,
            name: sub.user.email,
            icon: "DEPRECATED",
            type: "email",
        };
    }
    return sub;
}
type ListItemProps = {
    destination: DestinationType;
    user: UserType;
    unsubscribe: (...args: any[]) => any;
};
function ListItem({ destination: { name, type }, user, unsubscribe }: ListItemProps) {
    const canUnsubscribe = currentUser.isAdmin || (currentUser as any).id === user.id;
    return (<li className="destination-wrapper">
      <img src={`${IMG_ROOT}/${type}.png`} className="destination-icon" alt={name}/>
      <span className="flex-fill">{name}</span>
      {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'. */}
      {type === "email" && (<EmailSettingsWarning className="destination-warning" featureName="alert emails" mode="icon"/>)}
      {canUnsubscribe && (<Tooltip title="Remove" mouseEnterDelay={0.5}>
          <CloseOutlinedIcon className="remove-button" onClick={unsubscribe}/>
        </Tooltip>)}
    </li>);
}
type AlertDestinationsProps = {
    alertId: any;
};
type AlertDestinationsState = any;
export default class AlertDestinations extends React.Component<AlertDestinationsProps, AlertDestinationsState> {
    state = {
        dests: [],
        subs: null,
    };
    componentDidMount() {
        const { alertId } = this.props;
        Promise.all([
            DestinationService.query(),
            AlertSubscription.query({ alertId }),
        ]).then(([dests, subs]) => {
            subs = (subs as any).map(normalizeSub);
            this.setState({ dests, subs });
        });
    }
    showAddAlertSubDialog = () => {
        const { dests, subs } = this.state;
        SelectItemsDialog.showModal({
            width: 570,
            showCount: true,
            extraFooterContent: (<>
          <i className="fa fa-info-circle"/> Create new destinations in{" "}
          <Tooltip title="Opens page in a new tab.">
            <Link href="destinations/new" target="_blank">
              Alert Destinations
            </Link>
          </Tooltip>
        </>),
            dialogTitle: "Add Existing Alert Destinations",
            inputPlaceholder: "Search destinations...",
            searchItems: (searchTerm: any) => {
                searchTerm = toLower(searchTerm);
                return Promise.resolve(dests.filter(d => includes(toLower((d as any).name), searchTerm)));
            },
            renderItem: (item: any, { isSelected }: any) => {
                // @ts-expect-error ts-migrate(2571) FIXME: Object is of type 'unknown'.
                const alreadyInGroup = !!find(subs, s => s.destination.id === item.id);
                return {
                    content: (<div className="destination-wrapper">
              <img src={`${IMG_ROOT}/${item.type}.png`} className="destination-icon" alt={item.name}/>
              <span className="flex-fill">{item.name}</span>
              <ListItemAddon isSelected={isSelected} alreadyInGroup={alreadyInGroup} deselectedIcon="fa-plus"/>
            </div>),
                    isDisabled: alreadyInGroup,
                    className: isSelected || alreadyInGroup ? "selected" : "",
                };
            },
        }).onClose((items: any) => {
            const promises = map(items, item => this.subscribe(item));
            return Promise.all(promises)
                .then(() => {
                // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'string' is not assignable to par... Remove this comment to see the full error message
                notification.success("Subscribed.");
            })
                .catch(() => {
                // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'string' is not assignable to par... Remove this comment to see the full error message
                notification.error("Failed saving subscription.");
                return Promise.reject(null); // keep dialog visible but suppress its default error message
            });
        });
    };
    onUserEmailToggle = (sub: any) => {
        if (sub) {
            this.unsubscribe(sub);
        }
        else {
            // @ts-expect-error ts-migrate(2554) FIXME: Expected 1 arguments, but got 0.
            this.subscribe();
        }
    };
    subscribe = (dest: any) => {
        const { alertId } = this.props;
        const sub = { alert_id: alertId };
        if (dest) {
            (sub as any).destination_id = dest.id;
        }
        return AlertSubscription.create(sub).then(sub => {
            const { subs } = this.state;
            this.setState({
                // @ts-expect-error ts-migrate(2488) FIXME: Type 'null' must have a '[Symbol.iterator]()' meth... Remove this comment to see the full error message
                subs: [...subs, normalizeSub(sub)],
            });
        });
    };
    unsubscribe = (sub: any) => {
        AlertSubscription.delete(sub)
            .then(() => {
            // not showing subscribe notification cause it's redundant here
            const { subs } = this.state;
            this.setState({
                subs: without(subs, sub),
            });
        })
            .catch(() => {
            // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'string' is not assignable to par... Remove this comment to see the full error message
            notification.error("Failed unsubscribing.");
        });
    };
    render() {
        if (!this.props.alertId) {
            return null;
        }
        const { subs } = this.state;
        const currentUserEmailSub = find(subs, {
            destination: { id: USER_EMAIL_DEST_ID },
            user: { id: (currentUser as any).id },
        });
        const filteredSubs = without(subs, currentUserEmailSub);
        // @ts-expect-error ts-migrate(2339) FIXME: Property 'mailSettingsMissing' does not exist on t... Remove this comment to see the full error message
        const { mailSettingsMissing } = clientConfig;
        return (<div className="alert-destinations" data-test="AlertDestinations">
        <Tooltip title='Click to add an existing "Alert Destination"' mouseEnterDelay={0.5}>
          <Button data-test="ShowAddAlertSubDialog" type="primary" size="small" className="add-button" onClick={this.showAddAlertSubDialog}>
            <i className="fa fa-plus f-12 m-r-5"/> Add
          </Button>
        </Tooltip>
        <ul>
          <li className="destination-wrapper">
            <i className="destination-icon fa fa-envelope"/>
            <span className="flex-fill">{(currentUser as any).email}</span>
            {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'. */}
            <EmailSettingsWarning className="destination-warning" featureName="alert emails" mode="icon"/>
            {!mailSettingsMissing && (<Switch size="small" className="toggle-button" checked={!!currentUserEmailSub} loading={!subs} onChange={() => this.onUserEmailToggle(currentUserEmailSub)} data-test="UserEmailToggle"/>)}
          </li>
          {/* @ts-expect-error ts-migrate(2322) FIXME: Type '{ destination?: { id: number; }; user?: { id... Remove this comment to see the full error message */}
          {filteredSubs.map(s => (<ListItem key={(s as any).id} unsubscribe={() => this.unsubscribe(s)} {...s}/>))}
        </ul>
      </div>);
    }
}
