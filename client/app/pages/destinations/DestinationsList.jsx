import React from "react";
import PropTypes from "prop-types";
import Button from "antd/lib/button";
import { isEmpty, isString, find, get } from "lodash";
import Destination, { IMG_ROOT } from "@/services/destination";
import { policy } from "@/services/policy";
import routeWithUserSession from "@/components/ApplicationArea/routeWithUserSession";
import navigateTo from "@/components/ApplicationArea/navigateTo";
import CardsList from "@/components/cards-list/CardsList";
import LoadingState from "@/components/items-list/components/LoadingState";
import CreateSourceDialog from "@/components/CreateSourceDialog";
import helper from "@/components/dynamic-form/dynamicFormHelper";
import wrapSettingsTab from "@/components/SettingsWrapper";

class DestinationsList extends React.Component {
  static propTypes = {
    isNewDestinationPage: PropTypes.bool,
    onError: PropTypes.func,
  };

  static defaultProps = {
    isNewDestinationPage: false,
    onError: () => {},
  };

  state = {
    destinationTypes: [],
    destinations: [],
    loading: true,
  };

  componentDidMount() {
    Promise.all([Destination.query(), Destination.types()])
      .then(values =>
        this.setState(
          {
            destinations: values[0],
            destinationTypes: values[1],
            loading: false,
          },
          () => {
            // all resources are loaded in state
            if (this.props.isNewDestinationPage) {
              if (policy.canCreateDestination()) {
                this.showCreateSourceDialog();
              } else {
                navigateTo("destinations", true);
              }
            }
          }
        )
      )
      .catch(error => this.props.onError(error));
  }

  createDestination = (selectedType, values) => {
    const target = { options: {}, type: selectedType.type };
    helper.updateTargetWithValues(target, values);

    return Destination.create(target)
      .then(destination => {
        this.setState({ loading: true });
        Destination.query().then(destinations => this.setState({ destinations, loading: false }));
        return destination;
      })
      .catch(error => {
        const message = find([get(error, "response.data.message"), get(error, "message"), "Failed saving."], isString);
        return Promise.reject(new Error(message));
      });
  };

  showCreateSourceDialog = () => {
    CreateSourceDialog.showModal({
      types: this.state.destinationTypes,
      sourceType: "Alert Destination",
      imageFolder: IMG_ROOT,
      onCreate: this.createDestination,
    })
      .result.then((result = {}) => {
        if (result.success) {
          navigateTo(`destinations/${result.data.id}`);
        }
      })
      .catch(() => {
        navigateTo("destinations", true);
      });
  };

  renderDestinations() {
    const { destinations } = this.state;
    const items = destinations.map(destination => ({
      title: destination.name,
      imgSrc: `${IMG_ROOT}/${destination.type}.png`,
      href: `destinations/${destination.id}`,
    }));

    return isEmpty(destinations) ? (
      <div className="text-center">
        There are no alert destinations yet.
        {policy.isCreateDestinationEnabled() && (
          <div className="m-t-5">
            <a className="clickable" onClick={this.showCreateSourceDialog}>
              Click here
            </a>{" "}
            to add one.
          </div>
        )}
      </div>
    ) : (
      <CardsList items={items} />
    );
  }

  render() {
    const newDestinationProps = {
      type: "primary",
      onClick: policy.isCreateDestinationEnabled() ? this.showCreateSourceDialog : null,
      disabled: !policy.isCreateDestinationEnabled(),
    };

    return (
      <div>
        <div className="m-b-15">
          <Button {...newDestinationProps}>
            <i className="fa fa-plus m-r-5" />
            New Alert Destination
          </Button>
        </div>
        {this.state.loading ? <LoadingState className="" /> : this.renderDestinations()}
      </div>
    );
  }
}

const DestinationsListPage = wrapSettingsTab(
  {
    permission: "admin",
    title: "Alert Destinations",
    path: "destinations",
    order: 4,
  },
  DestinationsList
);

export default [
  routeWithUserSession({
    path: "/destinations",
    title: "Alert Destinations",
    render: pageProps => <DestinationsListPage {...pageProps} />,
  }),
  routeWithUserSession({
    path: "/destinations/new",
    title: "Alert Destinations",
    render: pageProps => <DestinationsListPage {...pageProps} isNewDestinationPage />,
  }),
];
