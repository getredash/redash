import React from "react";
import PropTypes from "prop-types";
import Tabs from "antd/lib/tabs";
import PageHeader from "@/components/PageHeader";

import "./layout.less";

export default function Layout({ activeTab, children }) {
  return (
    <div className="container admin-page-layout">
      <PageHeader title="Admin" />

      <div className="bg-white tiled">
        <Tabs className="admin-page-layout-tabs" defaultActiveKey={activeTab} animated={false} tabBarGutter={0}>
          <Tabs.TabPane key="system_status" tab={<a href="admin/status">System Status</a>}>
            {activeTab === "system_status" ? children : null}
          </Tabs.TabPane>
          <Tabs.TabPane key="jobs" tab={<a href="admin/queries/jobs">RQ Status</a>}>
            {activeTab === "jobs" ? children : null}
          </Tabs.TabPane>
          <Tabs.TabPane key="outdated_queries" tab={<a href="admin/queries/outdated">Outdated Queries</a>}>
            {activeTab === "outdated_queries" ? children : null}
          </Tabs.TabPane>
        </Tabs>
      </div>
    </div>
  );
}

Layout.propTypes = {
  activeTab: PropTypes.string,
  children: PropTypes.node,
};

Layout.defaultProps = {
  activeTab: "system_status",
  children: null,
};
