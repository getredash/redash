import React from 'react';
import { find } from 'lodash';
import { react2angular } from 'react2angular';
import { Destination } from '@/services/destination';
import { $route } from '@/services/ng';
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

  render() {
    const { destination, type } = this.state;

    return (
      <div className="row">
        {(destination && type) && <EditDestinationForm destination={destination} type={type} />}
      </div>
    );
  }
}

export default function init(ngModule) {
  ngModule.component('pageEditDestination', react2angular(EditDestination));

  return {
    '/destinations/:destinationId': {
      template: '<settings-screen><page-edit-destination></page-edit-destination></settings-screen>',
      title: 'Destinations',
    },
  };
}

init.init = true;
