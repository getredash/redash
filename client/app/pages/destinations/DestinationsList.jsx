import React from 'react';
import Button from 'antd/lib/button';
import { react2angular } from 'react2angular';
import { isEmpty, get } from 'lodash';
import settingsMenu from '@/services/settingsMenu';
import { Destination } from '@/services/destination';
import navigateTo from '@/services/navigateTo';
import TypePicker from '@/components/type-picker/TypePicker';
import LoadingState from '@/components/items-list/components/LoadingState';
import CreateSourceDialog from '@/components/CreateSourceDialog';
import helper from '@/components/dynamic-form/dynamicFormHelper';

class DestinationsList extends React.Component {
  constructor(props) {
    super(props);
    this.state = { destinationTypes: [], destinations: [], loading: true };
  }

  componentDidMount() {
    Destination.query(destinations => this.setState({ destinations, loading: false }));
    Destination.types(destinationTypes => this.setState({ destinationTypes }));
  }

  createDestination = (selectedType, values) => {
    const target = { options: {}, type: selectedType };
    helper.updateTargetWithValues(target, values);

    return Destination.save(target).$promise.then(() => {
      this.setState({ loading: true });
      Destination.query(destinations => this.setState({ destinations, loading: false }));
    }).catch((error) => {
      if (!(error instanceof Error)) {
        error = new Error(get(error, 'data.message', 'Failed saving.'));
      }
      return Promise.reject(error);
    });
  };

  showCreateSourceDialog = () => {
    CreateSourceDialog.showModal({
      types: this.state.destinationTypes,
      sourceType: 'Alert Destination',
      imageFolder: Destination.IMG_ROOT,
      onCreate: this.createDestination,
    });
  };

  renderDestinations() {
    const { destinations } = this.state;
    const types = destinations.map(destination => ({
      name: destination.name,
      type: destination.type,
      imgSrc: `${Destination.IMG_ROOT}/${destination.type}.png`,
      onClick: () => navigateTo(`destinations/${destination.id}`),
    }));

    return isEmpty(destinations) ? (
      <div className="text-center">
        There are no alert destinations yet.
        <div className="m-t-5">
          <a href="destinations/new">Click here</a> to add one.
        </div>
      </div>
    ) : (<TypePicker types={types} hideSearch />);
  }

  render() {
    return (
      <div>
        <div className="m-b-15">
          <Button type="primary" onClick={this.showCreateSourceDialog}>
            <i className="fa fa-plus m-r-5" />
            New Alert Destination
          </Button>
        </div>
        {this.state.loading ? <LoadingState className="" /> : this.renderDestinations()}
      </div>
    );
  }
}

export default function init(ngModule) {
  settingsMenu.add({
    permission: 'admin',
    title: 'Alert Destinations',
    path: 'destinations',
    order: 4,
  });

  ngModule.component('pageDestinationsList', react2angular(DestinationsList));

  return {
    '/destinations': {
      template: '<settings-screen><page-destinations-list></page-destinations-list></settings-screen>',
      title: 'Alert Destinations',
    },
  };
}

init.init = true;
