import React from 'react';
import PropTypes from 'prop-types';
import { react2angular } from 'react2angular';
import Select from 'antd/lib/select';
import { includes, without, compact } from 'lodash';

import Destination from './Destination';

class AlertSubscriptions extends React.Component {
  static propTypes = {
    alertId: PropTypes.number.isRequired,
  }
  constructor(props) {
    super(props);
    this.props.$q
      .all([
        this.props.Destination.query().$promise,
        this.props.AlertSubscription.query({ alertId: this.props.alertId }).$promise,
      ])
      .then((responses) => {
        let destinations = responses[0];
        const subscribers = responses[1];

        const mapF = s => s.destination && s.destination.id;
        const subscribedDestinations = compact(subscribers.map(mapF));

        const subscribedUsers = compact(subscribers.map(s => !s.destination && s.user.id));

        destinations = destinations.filter(d => !includes(subscribedDestinations, d.id));

        if (!includes(subscribedUsers, this.props.currentUser.id)) {
          destinations.unshift({
            name: this.props.currentUser.name + ' (Email)',
            id: null,
            icon: 'fa-envelope',
          });
        }
        this.setState({
          subscribers,
          destinations,
        });
      });
  }

  state = {
    selection: null,
    subscribers: [],
    destinations: [],
  }

  saveSubscriber = () => {
    const sub = new this.props.AlertSubscription({ alert_id: this.props.alertId });
    if (this.state.selection) {
      sub.destination_id = this.state.selection;
    }

    sub.$save(
      () => {
        this.props.toastr.success('Subscribed.');
        const destinations = this.state.destinations.filter(d => d.id !== this.state.selection);
        this.setState({
          subscribers: this.state.subscribers.concat(sub),
          destinations,
          selection: destinations.length ? destinations[0].id : null,
        });
      },
      () => {
        this.props.toastr.error('Failed saving subscription.');
      },
    );
  }

  unsubscribe = (subscriber) => {
    const destination = subscriber.destination;
    const user = subscriber.user;

    subscriber.$delete(
      () => {
        this.props.toastr.success('Unsubscribed');
        let destinations;
        const subscribers = without(this.state.subscribers, subscriber);
        if (destination) {
          destinations = this.state.destinations.concat(destination);
        } else if (user.id === this.props.currentUser.id) {
          destinations = this.state.destinations.concat({
            id: null,
            name: this.props.currentUser.name + ' (Email)',
            icon: 'fa-envelope',
          });
        }
        const newState = { subscribers, destinations };
        if (destinations.length === 1) {
          newState.selection = destinations[0].id;
        }
        this.setState(newState);
      },
      () => {
        this.props.toastr.error('Failed unsubscribing.');
      },
    );
  }

  updateSelection = selection => this.setState({ selection })

  render() {
    return (
      <div className="p-5">
        <h4>Notifications</h4>
        <div>
          <Select
            value={this.state.selection || null}
            disabled={this.state.destinations.length === 0}
            onChange={this.updateSelection}
          >
            {this.state.destinations.map(d => <Select.Option value={d.id} key={d.name}><Destination destination={d} /></Select.Option>)}
          </Select>
        </div>
        <div className="m-t-5">
          <button
            className="btn btn-default"
            onClick={this.saveSubscriber}
            disabled={this.state.destinations.length === 0}
            style={{ width: '50%' }}
          >Add
          </button>
          <span className="pull-right m-t-5">
            {this.props.currentUser.isAdmin ? <a href="destinations/new">Create New Destination</a> : ''}
          </span>
        </div>
        <hr />
        <div>
          {this.state.subscribers.map(s => (
            <div className="list-group-item" key={s.id}>
              <Destination destination={s} />
              {this.props.currentUser.isAdmin ||
               this.props.currentUser.id === s.user.id ?
                 <button
                   className="btn btn-xs btn-danger pull-right"
                   onClick={() => this.unsubscribe(s)}
                 >Remove
                 </button> : ''
              }
            </div>
          ))}
        </div>
      </div>
    );
  }
}

export default function init(ngModule) {
  ngModule.component('alertSubscriptions', react2angular(AlertSubscriptions, null, ['currentUser', '$q', 'Destination', 'AlertSubscription', 'toastr']));
}
init.init = true;
