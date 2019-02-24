import React from 'react';
import { find } from 'lodash';
import { react2angular } from 'react2angular';
import Modal from 'antd/lib/modal';
import { Destination } from '@/services/destination';
import navigateTo from '@/services/navigateTo';
import { $route, toastr } from '@/services/ng';
import EditDestinationForm from '@/components/destinations/EditDestinationForm';

class EditDestination extends React.Component {
  constructor(props) {
    super(props);
    this.state = { destination: null, type: null };
  }

  componentDidMount() {
    Destination.get({ id: $route.current.params.destinationId }, (destination) => {
      const { type } = destination;
      this.setState({ destination });
      Destination.types(types => this.setState({ type: find(types, { type }) }));
    });
  }

  deleteDestination = (callback) => {
    const { destination } = this.state;

    const doDelete = () => {
      destination.$delete(() => {
        toastr.success('Alert destination deleted successfully.');
        navigateTo('/destinations', true);
      }, () => {
        callback();
      });
    };

    Modal.confirm({
      title: 'Delete Alert Destination',
      content: 'Are you sure you want to delete this alert destination?',
      okText: 'Delete',
      okType: 'danger',
      onOk: doDelete,
      onCancel: callback,
      maskClosable: true,
      autoFocusButton: null,
    });
  };

  render() {
    const { destination, type } = this.state;
    const formProps = {
      destination,
      type,
      actions: [
        { name: 'Delete', type: 'danger', callback: this.deleteDestination },
      ],
    };

    return (
      <div className="row">
        {(destination && type) && <EditDestinationForm {...formProps} />}
      </div>
    );
  }
}

export default function init(ngModule) {
  ngModule.component('pageEditDestination', react2angular(EditDestination));

  return {
    '/destinations/:destinationId': {
      template: '<settings-screen><page-edit-destination></page-edit-destination></settings-screen>',
      title: 'Alert Destinations',
    },
  };
}

init.init = true;
