import React, { useEffect, useState } from "react";
import { axios } from "@/services/axios";
import PropTypes from "prop-types";
import { includes, isEmpty } from "lodash";
import Alert from "antd/lib/alert";
import Icon from "antd/lib/icon";
import List from "antd/lib/list";
import AuthenticatedPageWrapper from "@/components/ApplicationArea/AuthenticatedPageWrapper";
import FavoritesControl from "@/components/FavoritesControl";
import EmptyState from "@/components/empty-state/EmptyState";
import DynamicComponent from "@/components/DynamicComponent";
import BeaconConsent from "@/components/BeaconConsent";
import recordEvent from "@/services/recordEvent";
import { messages } from "@/services/auth";
import notification from "@/services/notification";
import { Dashboard } from "@/services/dashboard";
import { Query } from "@/services/query";

function DeprecatedEmbedFeatureAlert() {
  return (
    <Alert
      className="m-b-15"
      type="warning"
      message={
        <>
          You have enabled <code>ALLOW_PARAMETERS_IN_EMBEDS</code>. This setting is now deprecated and should be turned
          off. Parameters in embeds are supported by default.{" "}
          <a
            href="https://discuss.redash.io/t/support-for-parameters-in-embedded-visualizations/3337"
            target="_blank"
            rel="noopener noreferrer">
            Read more
          </a>
          .
        </>
      }
    />
  );
}

function EmailNotVerifiedAlert() {
  const verifyEmail = () => {
    axios.post("verification_email").then(data => {
      notification.success(data.message);
    });
  };

  return (
    <Alert
      className="m-b-15"
      type="warning"
      message={
        <>
          We have sent an email with a confirmation link to your email address. Please follow the link to verify your
          email address.{" "}
          <a className="clickable" onClick={verifyEmail}>
            Resend email
          </a>
          .
        </>
      }
    />
  );
}

function FavoriteList({ title, resource, itemUrl, emptyState }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    resource
      .favorites()
      .then(({ results }) => setItems(results))
      .finally(() => setLoading(false));
  }, [resource]);

  return (
    <>
      <div className="d-flex align-items-center m-b-20">
        <p className="flex-fill f-500 c-black m-0">{title}</p>
        {loading && <Icon type="loading" />}
      </div>
      {!isEmpty(items) && (
        <List
          bordered
          size="small"
          dataSource={items}
          rowKey={item => itemUrl(item)}
          renderItem={item => (
            <List.Item className="ant-list-item-link">
              <a href={itemUrl(item)}>
                <FavoritesControl className="m-r-5" item={item} readOnly />
                {item.name}
                {item.is_draft && <span className="label label-default m-l-5">Unpublished</span>}
              </a>
            </List.Item>
          )}
        />
      )}
      {isEmpty(items) && !loading && emptyState}
    </>
  );
}

FavoriteList.propTypes = {
  title: PropTypes.string.isRequired,
  resource: PropTypes.func.isRequired, // eslint-disable-line react/forbid-prop-types
  itemUrl: PropTypes.func.isRequired,
  emptyState: PropTypes.node,
};
FavoriteList.defaultProps = { emptyState: null };

function DashboardAndQueryFavoritesList() {
  return (
    <div className="tile">
      <div className="t-body tb-padding">
        <div className="row">
          <div className="col-sm-6">
            <FavoriteList
              title="Favorite Dashboards"
              resource={Dashboard}
              itemUrl={dashboard => `dashboard/${dashboard.slug}`}
              emptyState={
                <p>
                  <FavoritesControl className="m-r-5" item={{ is_favorite: true }} readOnly />
                  Favorite <a href="dashboards">Dashboards</a> will appear here
                </p>
              }
            />
          </div>
          <div className="col-sm-6">
            <FavoriteList
              title="Favorite Queries"
              resource={Query}
              itemUrl={query => `queries/${query.id}`}
              emptyState={
                <p>
                  <FavoritesControl className="m-r-5" item={{ is_favorite: true }} readOnly />
                  Favorite <a href="queries">Queries</a> will appear here
                </p>
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Home() {
  useEffect(() => {
    recordEvent("view", "page", "personal_homepage");
  }, []);

  return (
    <div className="home-page">
      <div className="container">
        {includes(messages, "using-deprecated-embed-feature") && <DeprecatedEmbedFeatureAlert />}
        {includes(messages, "email-not-verified") && <EmailNotVerifiedAlert />}
        <EmptyState
          header="Welcome to Redash 👋"
          description="Connect to any data source, easily visualize and share your data"
          illustration="dashboard"
          helpLink="https://redash.io/help/user-guide/getting-started"
          showDashboardStep
          showInviteStep
          onboardingMode
        />
        <DynamicComponent name="HomeExtra" />
        <DashboardAndQueryFavoritesList />
        <BeaconConsent />
      </div>
    </div>
  );
}

export default {
  path: "/",
  title: "Redash",
  render: currentRoute => (
    <AuthenticatedPageWrapper key={currentRoute.key}>
      <Home {...currentRoute.routeParams} />
    </AuthenticatedPageWrapper>
  ),
};
