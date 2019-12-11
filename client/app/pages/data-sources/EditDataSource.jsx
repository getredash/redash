import React from "react";
import PropTypes from "prop-types";
import { get, find, toUpper } from "lodash";
import { react2angular } from "react2angular";
import Modal from "antd/lib/modal";
import { DataSource, IMG_ROOT } from "@/services/data-source";
import navigateTo from "@/services/navigateTo";
import { $route } from "@/services/ng";
import notification from "@/services/notification";
import PromiseRejectionError from "@/lib/promise-rejection-error";
import LoadingState from "@/components/items-list/components/LoadingState";
import DynamicForm from "@/components/dynamic-form/DynamicForm";
import helper from "@/components/dynamic-form/dynamicFormHelper";
import HelpTrigger, { TYPES as HELP_TRIGGER_TYPES } from "@/components/HelpTrigger";
import wrapSettingsTab from "@/components/SettingsWrapper";

class EditDataSource extends React.Component {
  static propTypes = {
    onError: PropTypes.func,
  };

  static defaultProps = {
    onError: () => {},
  };

  state = {
    dataSource: null,
    type: null,
    loading: true,
  };

  componentDidMount() {
    DataSource.get({ id: $route.current.params.dataSourceId })
      .$promise.then(dataSource => {
        const { type } = dataSource;
        this.setState({ dataSource });
        DataSource.types(types => this.setState({ type: find(types, { type }), loading: false }));
      })
      .catch(error => {
        // ANGULAR_REMOVE_ME This code is related to Angular's HTTP services
        if (error.status && error.data) {
          error = new PromiseRejectionError(error);
        }
        this.props.onError(error);
      });
  }

  saveDataSource = (values, successCallback, errorCallback) => {
    const { dataSource } = this.state;
    helper.updateTargetWithValues(dataSource, values);
    dataSource.$save(
      () => successCallback("Saved."),
      error => {
        const message = get(error, "data.message", "Failed saving.");
        errorCallback(message);
      }
    );
  };

  deleteDataSource = callback => {
    const { dataSource } = this.state;

    const doDelete = () => {
      dataSource.$delete(
        () => {
          notification.success("Data source deleted successfully.");
          navigateTo("/data_sources", true);
        },
        () => {
          callback();
        }
      );
    };

    Modal.confirm({
      title: "Delete Data Source",
      content: "Are you sure you want to delete this data source?",
      okText: "Delete",
      okType: "danger",
      onOk: doDelete,
      onCancel: callback,
      maskClosable: true,
      autoFocusButton: null,
    });
  };

  testConnection = callback => {
    const { dataSource } = this.state;
    DataSource.test(
      { id: dataSource.id },
      httpResponse => {
        if (httpResponse.ok) {
          notification.success("Success");
        } else {
          notification.error("Connection Test Failed:", httpResponse.message, { duration: 10 });
        }
        callback();
      },
      () => {
        notification.error(
          "Connection Test Failed:",
          "Unknown error occurred while performing connection test. Please try again later.",
          { duration: 10 }
        );
        callback();
      }
    );
  };

  renderForm() {
    const { dataSource, type } = this.state;
    const fields = helper.getFields(type, dataSource);
    const helpTriggerType = `DS_${toUpper(type.type)}`;
    const formProps = {
      fields,
      type,
      actions: [
        { name: "Delete", type: "danger", callback: this.deleteDataSource },
        { name: "Test Connection", pullRight: true, callback: this.testConnection, disableWhenDirty: true },
      ],
      onSubmit: this.saveDataSource,
      feedbackIcons: true,
    };

    return (
      <div className="row" data-test="DataSource">
        <div className="text-right m-r-10">
          {HELP_TRIGGER_TYPES[helpTriggerType] && (
            <HelpTrigger className="f-13" type={helpTriggerType}>
              Setup Instructions <i className="fa fa-question-circle" />
            </HelpTrigger>
          )}
        </div>
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
  ngModule.component("pageEditDataSource", react2angular(wrapSettingsTab(null, EditDataSource)));

  return {
    "/data_sources/:dataSourceId": {
      template: '<page-edit-data-source on-error="handleError"></page-edit-data-source>',
      title: "Data Sources",
      controller($scope, $exceptionHandler) {
        "ngInject";

        $scope.handleError = $exceptionHandler;
      },
    },
  };
}

init.init = true;
