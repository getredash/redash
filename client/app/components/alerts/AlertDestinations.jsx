import React from 'react';
import PropTypes from 'prop-types';
import { without, find, isEmpty, includes, map } from 'lodash';
// import Tag from 'antd/lib/tag';
import Icon from 'antd/lib/icon';
import Tooltip from 'antd/lib/tooltip';
import Switch from 'antd/lib/switch';
import Button from 'antd/lib/button';

import SelectItemsDialog from '@/components/SelectItemsDialog';
import { Destination as DestinationType, UserProfile as UserType } from '@/components/proptypes';

import { Destination as DestinationService } from '@/services/destination';
import { AlertSubscription } from '@/services/alert-subscription';
import { $q } from '@/services/ng';
import { currentUser } from '@/services/auth';
import notification from '@/services/notification';
import ListItemAddon from '@/components/groups/ListItemAddon';

const USER_EMAIL_DEST_ID = -1;

function normalizeSub(sub) {
  if (!sub.destination) {
    sub.destination = {
      id: USER_EMAIL_DEST_ID,
      name: sub.user.email,
      icon: 'fa-envelope-o',
      type: 'userEmail',
    };
  }
  return sub;
}

function ListItem({ destination: { icon, name }, user, unsubscribe }) {
  const canUnsubscribe = currentUser.isAdmin || currentUser.id === user.id;

  return (
    <li className="destination-wrapper">
      <i className={`destination-icon fa ${icon}`} /> {name}
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
    alertId: PropTypes.number,
  }

  static defaultProps = {
    alertId: null,
  }

  state = {
    dests: [],
    subs: null,
  }

  componentDidMount() {
    const { alertId } = this.props;
    $q
      .all([
        DestinationService.query().$promise, // get all destinations
        AlertSubscription.query({ alertId }).$promise, // get subcriptions per alert
      ])
      .then(([dests, subs]) => {
        subs = subs.map(normalizeSub);
        this.setState({ dests, subs });
      });
  }

  showAddAlertSubDialog = () => {
    const { dests, subs } = this.state;

    SelectItemsDialog.showModal({
      dialogTitle: 'Add Destinations',
      inputPlaceholder: 'Search destinations...',
      selectedItemsTitle: 'Pending Destinations',
      searchItems: (searchTerm) => {
        searchTerm = searchTerm.toLowerCase();
        const filtered = dests.filter(d => isEmpty(searchTerm) || includes(d.name.toLowerCase(), searchTerm));
        return Promise.resolve(filtered);
      },
      renderItem: (item, { isSelected }) => {
        const alreadyInGroup = !!find(subs, s => s.destination.id === item.id);

        return {
          content: (
            <div className="destination-wrapper">
              <i className={`destination-icon fa ${item.icon}`} />
              {item.name}
              <ListItemAddon isSelected={isSelected} alreadyInGroup={alreadyInGroup} />
            </div>
          ),
          isDisabled: alreadyInGroup,
          className: isSelected || alreadyInGroup ? 'selected' : '',
        };
      },
      renderStagedItem: item => ({
        content: (
          <div className="destination-wrapper">
            <i className={`destination-icon fa ${item.icon}`} />
            {item.name}
            <ListItemAddon isStaged />
          </div>
        ),
      }),
      save: (items) => {
        const promises = map(items, item => this.subscribe(item));
        return Promise.all(promises).then(() => {
          notification.success('Subscribed.');
        }).catch(() => {
          notification.error('Failed saving subscription.');
        });
      },
    });
  }

  onUserEmailToggle = (sub) => {
    if (sub) {
      this.unsubscribe(sub);
    } else {
      this.subscribe();
    }
  }

  subscribe = (dest) => {
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
  }

  unsubscribe = (sub) => {
    sub.$delete(
      () => {
        // not showing subscribe notification cause it's redundant here
        const { subs } = this.state;
        this.setState({
          subs: without(subs, sub),
        });
      },
      () => {
        notification.error('Failed unsubscribing.');
      },
    );
  };

  render() {
    if (!this.props.alertId) {
      return 'oi vey';
    }

    const { subs } = this.state;
    const currentUserEmailSub = find(subs, {
      destination: { id: USER_EMAIL_DEST_ID },
      user: { id: currentUser.id },
    });
    const filteredSubs = without(subs, currentUserEmailSub);

    return (
      <div className="alert-destinations">
        <Tooltip title="Click to add an existing &quot;Alert Destination&quot; or create a new one." mouseEnterDelay={0.5}>
          <Button type="primary" size="small" className="add-button" onClick={this.showAddAlertSubDialog}><i className="fa fa-plus" /> Add</Button>
        </Tooltip>
        <ul>
          <li className="destination-wrapper">
            <i className="destination-icon fa fa-envelope-o" /> { currentUser.email }
            <Switch
              size="small"
              className="toggle-button"
              checked={!!currentUserEmailSub}
              loading={!subs}
              onChange={() => this.onUserEmailToggle(currentUserEmailSub)}
            />
          </li>
          {filteredSubs.map(s => <ListItem key={s.id} unsubscribe={() => this.unsubscribe(s)} {...s} />)}
        </ul>
      </div>
    );
  }
}
