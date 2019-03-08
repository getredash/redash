import React from 'react';
import { get, find } from 'lodash';
import { react2angular } from 'react2angular';
import Modal from 'antd/lib/modal';
import { Destination } from '@/services/destination';
import navigateTo from '@/services/navigateTo';
import { $route, toastr } from '@/services/ng';
import LoadingState from '@/components/items-list/components/LoadingState';
import DynamicForm from '@/components/dynamic-form/DynamicForm';
import helper from '@/components/dynamic-form/dynamicFormHelper';

class EditDestination extends React.Component {
  constructor(props) {
    super(props);
    this.state = { destination: null, type: null, loading: true };
  }

  componentDidMount() {
    Destination.get({ id: $route.current.params.destinationId }, (destination) => {
      const { type } = destination;
      this.setState({ destination });
      Destination.types(types => this.setState({ type: find(types, { type }), loading: false }));
    });
  }

  saveDestination = (values, successCallback, errorCallback) => {
    const { destination } = this.state;
    helper.updateTargetWithValues(destination, values);
    destination.$save(
      () => successCallback('Saved.'),
      (error) => {
        const message = get(error, 'data.message', 'Failed saving.');
        errorCallback(message);
      },
    );
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

  renderForm() {
    const { destination, type } = this.state;
    const fields = helper.getFields(type.configuration_schema, destination);
    const formProps = {
      fields,
      type,
      actions: [
        { name: 'Delete', type: 'danger', callback: this.deleteDestination },
      ],
      onSubmit: this.saveDestination,
      feedbackIcons: true,
    };

    return (
      <div className="row" data-test="Destination">
        <div className="d-flex justify-content-center align-items-center">
          <img src={`${Destination.IMG_ROOT}/${type.type}.png`} alt={type.name} width="64" />
          <h3 className="m-0">{type.name}</h3>
        </div>
        <div className="col-md-4 col-md-offset-4 m-b-10">
          <DynamicForm {...formProps} />
        </div>
      </div>
    );
  }

  render() {
    return this.state.loading ? <LoadingState className="" /> : this.renderForm();
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
