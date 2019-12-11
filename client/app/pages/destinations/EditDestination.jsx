import React from "react";
import PropTypes from "prop-types";
import { get, find } from "lodash";
import { react2angular } from "react2angular";
import Modal from "antd/lib/modal";
import { Destination, IMG_ROOT } from "@/services/destination";
import navigateTo from "@/services/navigateTo";
import { $route } from "@/services/ng";
import notification from "@/services/notification";
import PromiseRejectionError from "@/lib/promise-rejection-error";
import LoadingState from "@/components/items-list/components/LoadingState";
import DynamicForm from "@/components/dynamic-form/DynamicForm";
import helper from "@/components/dynamic-form/dynamicFormHelper";
import wrapSettingsTab from "@/components/SettingsWrapper";

class EditDestination extends React.Component {
  static propTypes = {
    onError: PropTypes.func,
  };

  static defaultProps = {
    onError: () => {},
  };

  state = {
    destination: null,
    type: null,
    loading: true,
  };

  componentDidMount() {
    Destination.get({ id: $route.current.params.destinationId })
      .$promise.then(destination => {
        const { type } = destination;
        this.setState({ destination });
        Destination.types(types => this.setState({ type: find(types, { type }), loading: false }));
      })
      .catch(error => {
        // ANGULAR_REMOVE_ME This code is related to Angular's HTTP services
        if (error.status && error.data) {
          error = new PromiseRejectionError(error);
        }
        this.props.onError(error);
      });
  }

  saveDestination = (values, successCallback, errorCallback) => {
    const { destination } = this.state;
    helper.updateTargetWithValues(destination, values);
    destination.$save(
      () => successCallback("Saved."),
      error => {
        const message = get(error, "data.message", "Failed saving.");
        errorCallback(message);
      }
    );
  };

  deleteDestination = callback => {
    const { destination } = this.state;

    const doDelete = () => {
      destination.$delete(
        () => {
          notification.success("Alert destination deleted successfully.");
          navigateTo("/destinations", true);
        },
        () => {
          callback();
        }
      );
    };

    Modal.confirm({
      title: "Delete Alert Destination",
      content: "Are you sure you want to delete this alert destination?",
      okText: "Delete",
      okType: "danger",
      onOk: doDelete,
      onCancel: callback,
      maskClosable: true,
      autoFocusButton: null,
    });
  };

  renderForm() {
    const { destination, type } = this.state;
    const fields = helper.getFields(type, destination);
    const formProps = {
      fields,
      type,
      actions: [{ name: "Delete", type: "danger", callback: this.deleteDestination }],
      onSubmit: this.saveDestination,
      feedbackIcons: true,
    };

    return (
      <div className="row" data-test="Destination">
        <div className="text-center m-b-10">
          <img className="p-5" src={`${IMG_ROOT}/${type.type}.png`} alt={type.name} width="64" />
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
  ngModule.component("pageEditDestination", react2angular(wrapSettingsTab(null, EditDestination)));

  return {
    "/destinations/:destinationId": {
      template: '<page-edit-destination on-error="handleError"></page-edit-destination>',
      title: "Alert Destinations",
      controller($scope, $exceptionHandler) {
        "ngInject";

        $scope.handleError = $exceptionHandler;
      },
    },
  };
}

init.init = true;
