import React from "react";
import PropTypes from "prop-types";
import { get } from "lodash";

import Button from "antd/lib/button";
import Form from "antd/lib/form";
import routeWithUserSession from "@/components/ApplicationArea/routeWithUserSession";
import LoadingState from "@/components/items-list/components/LoadingState";

import recordEvent from "@/services/recordEvent";
import OrgSettings from "@/services/organizationSettings";
import wrapSettingsTab from "@/components/SettingsWrapper";

import GeneralSettings from "./components/GeneralSettings";
import AuthSettings from "./components/AuthSettings";

class OrganizationSettings extends React.Component {
  static propTypes = {
    onError: PropTypes.func,
  };

  static defaultProps = {
    onError: () => {},
  };

  state = {
    settings: {},
    formValues: {},
    loading: true,
    submitting: false,
  };

  componentDidMount() {
    recordEvent("view", "page", "org_settings");
    OrgSettings.get()
      .then(response => {
        const settings = get(response, "settings");
        this.setState({ settings, formValues: { ...settings }, loading: false });
      })
      .catch(error => this.props.onError(error));
  }

  handleSubmit = e => {
    e.preventDefault();
    if (!this.state.submitting) {
      this.setState({ submitting: true });
      OrgSettings.save(this.state.formValues)
        .then(response => {
          const settings = get(response, "settings");
          this.setState({ settings, formValues: { ...settings } });
        })
        .catch(error => this.props.onError(error))
        .finally(() => this.setState({ submitting: false }));
    }
  };

  handleChange = changes => {
    this.setState(prevState => ({ formValues: { ...prevState.formValues, ...changes } }));
  };

  render() {
    const { loading, submitting } = this.state;
    return (
      <div className="row" data-test="OrganizationSettings">
        <div className="col-md-offset-4 col-md-4">
          {loading ? (
            <LoadingState className="" />
          ) : (
            <Form layout="vertical" onSubmit={this.handleSubmit}>
              <GeneralSettings
                settings={this.state.settings}
                values={this.state.formValues}
                onChange={this.handleChange}
              />
              <AuthSettings
                settings={this.state.settings}
                values={this.state.formValues}
                onChange={this.handleChange}
              />
              <Button className="w-100" type="primary" htmlType="submit" loading={submitting}>
                Save
              </Button>
            </Form>
          )}
        </div>
      </div>
    );
  }
}

const OrganizationSettingsPage = wrapSettingsTab(
  {
    permission: "admin",
    title: "Settings",
    path: "settings/organization",
    order: 6,
  },
  OrganizationSettings
);

export default routeWithUserSession({
  path: "/settings/organization",
  title: "Organization Settings",
  render: pageProps => <OrganizationSettingsPage {...pageProps} />,
});
