import { get, find } from "lodash";
import React from "react";

import Modal from "antd/lib/modal";
import routeWithUserSession from "@/components/ApplicationArea/routeWithUserSession";
import navigateTo from "@/components/ApplicationArea/navigateTo";
import LoadingState from "@/components/items-list/components/LoadingState";
import DynamicForm from "@/components/dynamic-form/DynamicForm";
import helper from "@/components/dynamic-form/dynamicFormHelper";
import wrapSettingsTab from "@/components/SettingsWrapper";

import Destination, { IMG_ROOT } from "@/services/destination";
import notification from "@/services/notification";
import routes from "@/services/routes";

type OwnProps = {
    destinationId: string;
    onError?: (...args: any[]) => any;
};

type State = any;

type Props = OwnProps & typeof EditDestination.defaultProps;

class EditDestination extends React.Component<Props, State> {

  static defaultProps = {
    onError: () => {},
  };

  state = {
    destination: null,
    type: null,
    loading: true,
  };

  componentDidMount() {
    Destination.get({ id: this.props.destinationId })
      .then(destination => {
        // @ts-expect-error ts-migrate(2339) FIXME: Property 'type' does not exist on type 'AxiosRespo... Remove this comment to see the full error message
        const { type } = destination;
        this.setState({ destination });
        Destination.types().then(types => this.setState({ type: find(types, { type }), loading: false }));
      })
      .catch(error => this.props.onError(error));
  }

  saveDestination = (values: any, successCallback: any, errorCallback: any) => {
    const { destination } = this.state;
    helper.updateTargetWithValues(destination, values);
    Destination.save(destination)
      .then(() => successCallback("Saved."))
      .catch(error => {
        const message = get(error, "response.data.message", "Failed saving.");
        errorCallback(message);
      });
  };

  deleteDestination = (callback: any) => {
    const { destination } = this.state;

    const doDelete = () => {
      Destination.delete(destination)
        .then(() => {
          // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'string' is not assignable to par... Remove this comment to see the full error message
          notification.success("Alert destination deleted successfully.");
          navigateTo("destinations");
        })
        .catch(() => {
          callback();
        });
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
    // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'null' is not assignable to param... Remove this comment to see the full error message
    const fields = helper.getFields(type, destination);
    const formProps = {
      fields,
      type,
      actions: [{ name: "Delete", type: "danger", callback: this.deleteDestination }],
      onSubmit: this.saveDestination,
      defaultShowExtraFields: helper.hasFilledExtraField(type, destination),
      feedbackIcons: true,
    };

    return (
      <div className="row" data-test="Destination">
        <div className="text-center m-b-10">
          {/* @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'. */}
          <img className="p-5" src={`${IMG_ROOT}/${type.type}.png`} alt={type.name} width="64" />
          {/* @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'. */}
          <h3 className="m-0">{type.name}</h3>
        </div>
        <div className="col-md-4 col-md-offset-4 m-b-10">
          {/* @ts-expect-error ts-migrate(2322) FIXME: Type '{ fields: any[]; type: null; actions: { name... Remove this comment to see the full error message */}
          <DynamicForm {...formProps} />
        </div>
      </div>
    );
  }

  render() {
    return this.state.loading ? <LoadingState className="" /> : this.renderForm();
  }
}

const EditDestinationPage = wrapSettingsTab("AlertDestinations.Edit", null, EditDestination);

routes.register(
  "AlertDestinations.Edit",
  routeWithUserSession({
    path: "/destinations/:destinationId",
    title: "Alert Destinations",
    render: pageProps => <EditDestinationPage {...pageProps} />,
  })
);
