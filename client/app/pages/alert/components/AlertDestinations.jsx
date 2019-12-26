import React from "react";
import PropTypes from "prop-types";
import { without, find, isEmpty, includes, map } from "lodash";

import SelectItemsDialog from "@/components/SelectItemsDialog";
import { Destination as DestinationType, UserProfile as UserType } from "@/components/proptypes";

import { Destination as DestinationService, IMG_ROOT } from "@/services/destination";
import { AlertSubscription } from "@/services/alert-subscription";
import { $q } from "@/services/ng";
import { clientConfig, currentUser } from "@/services/auth";
import notification from "@/services/notification";
import ListItemAddon from "@/components/groups/ListItemAddon";
import EmailSettingsWarning from "@/components/EmailSettingsWarning";

import Icon from "antd/lib/icon";
import Tooltip from "antd/lib/tooltip";
import Switch from "antd/lib/switch";
import Button from "antd/lib/button";

import "./AlertDestinations.less";

const USER_EMAIL_DEST_ID = -1;

function normalizeSub(sub) {
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

function ListItem({ destination: { name, type }, user, unsubscribe }) {
  const canUnsubscribe = currentUser.isAdmin || currentUser.id === user.id;

  return (
    <li className="destination-wrapper">
      <img src={`${IMG_ROOT}/${type}.png`} className="destination-icon" alt={name} />
      <span className="flex-fill">{name}</span>
      {type === "email" && (
        <EmailSettingsWarning className="destination-warning" featureName="alert emails" mode="icon" />
      )}
      {canUnsubscribe && (
        <Tooltip title="Remove" mouseEnterDelay={0.5}>
          <Icon type="close" className="remove-button" onClick={unsubscribe} />
        </Tooltip>
      )}
    </li>
  );
}

ListItem.propTypes = {
  destination: DestinationType.isRequired,
  user: UserType.isRequired,
  unsubscribe: PropTypes.func.isRequired,
};

export default class AlertDestinations extends React.Component {
  static propTypes = {
    alertId: PropTypes.number.isRequired,
  };

  state = {
    dests: [],
    subs: null,
  };

  componentDidMount() {
    const { alertId } = this.props;
    $q.all([
      DestinationService.query().$promise, // get all destinations
      AlertSubscription.query({ alertId }).$promise, // get subcriptions per alert
    ]).then(([dests, subs]) => {
      subs = subs.map(normalizeSub);
      this.setState({ dests, subs });
    });
  }

  showAddAlertSubDialog = () => {
    const { dests, subs } = this.state;

    SelectItemsDialog.showModal({
      width: 570,
      showCount: true,
      extraFooterContent: (
        <>
          <i className="fa fa-info-circle" /> Create new destinations in{" "}
          <Tooltip title="Opens page in a new tab.">
            <a href="destinations/new" target="_blank">
              Alert Destinations
            </a>
          </Tooltip>
        </>
      ),
      dialogTitle: "Add Existing Alert Destinations",
      inputPlaceholder: "Search destinations...",
      searchItems: searchTerm => {
        searchTerm = searchTerm.toLowerCase();
        const filtered = dests.filter(d => isEmpty(searchTerm) || includes(d.name.toLowerCase(), searchTerm));
        return Promise.resolve(filtered);
      },
      renderItem: (item, { isSelected }) => {
        const alreadyInGroup = !!find(subs, s => s.destination.id === item.id);

        return {
          content: (
            <div className="destination-wrapper">
              <img src={`${IMG_ROOT}/${item.type}.png`} className="destination-icon" alt={item.name} />
              <span className="flex-fill">{item.name}</span>
              <ListItemAddon isSelected={isSelected} alreadyInGroup={alreadyInGroup} deselectedIcon="fa-plus" />
            </div>
          ),
          isDisabled: alreadyInGroup,
          className: isSelected || alreadyInGroup ? "selected" : "",
        };
      },
      save: items => {
        const promises = map(items, item => this.subscribe(item));
        return Promise.all(promises)
          .then(() => {
            notification.success("Subscribed.");
          })
          .catch(() => {
            notification.error("Failed saving subscription.");
          });
      },
    });
  };

  onUserEmailToggle = sub => {
    if (sub) {
      this.unsubscribe(sub);
    } else {
      this.subscribe();
    }
  };

  subscribe = dest => {
    const { alertId } = this.props;

    const sub = new AlertSubscription({ alert_id: alertId });
    if (dest) {
      sub.destination_id = dest.id;
    }

    return sub.$save(() => {
      const { subs } = this.state;
      this.setState({
        subs: [...subs, normalizeSub(sub)],
      });
    });
  };

  unsubscribe = sub => {
    sub.$delete(
      () => {
        // not showing subscribe notification cause it's redundant here
        const { subs } = this.state;
        this.setState({
          subs: without(subs, sub),
        });
      },
      () => {
        notification.error("Failed unsubscribing.");
      }
    );
  };

  render() {
    if (!this.props.alertId) {
      return null;
    }

    const { subs } = this.state;
    const currentUserEmailSub = find(subs, {
      destination: { id: USER_EMAIL_DEST_ID },
      user: { id: currentUser.id },
    });
    const filteredSubs = without(subs, currentUserEmailSub);
    const { mailSettingsMissing } = clientConfig;

    return (
      <div className="alert-destinations" data-test="AlertDestinations">
        <Tooltip title='Click to add an existing "Alert Destination"' mouseEnterDelay={0.5}>
          <Button
            data-test="ShowAddAlertSubDialog"
            type="primary"
            size="small"
            className="add-button"
            onClick={this.showAddAlertSubDialog}>
            <i className="fa fa-plus f-12 m-r-5" /> Add
          </Button>
        </Tooltip>
        <ul>
          <li className="destination-wrapper">
            <i className="destination-icon fa fa-envelope" />
            <span className="flex-fill">{currentUser.email}</span>
            <EmailSettingsWarning className="destination-warning" featureName="alert emails" mode="icon" />
            {!mailSettingsMissing && (
              <Switch
                size="small"
                className="toggle-button"
                checked={!!currentUserEmailSub}
                loading={!subs}
                onChange={() => this.onUserEmailToggle(currentUserEmailSub)}
                data-test="UserEmailToggle"
              />
            )}
          </li>
          {filteredSubs.map(s => (
            <ListItem key={s.id} unsubscribe={() => this.unsubscribe(s)} {...s} />
          ))}
        </ul>
      </div>
    );
  }
}
