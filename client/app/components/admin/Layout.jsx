import React from "react";
import PropTypes from "prop-types";
import Tabs from "antd/lib/tabs";
import PageHeader from "@/components/PageHeader";
import Link from "@/components/Link";

import "./layout.less";

export default function Layout({ activeTab, children }) {
  return (
    <div className="admin-page-layout">
      <div className="container">
        <PageHeader title="Admin" />

        <div className="bg-white tiled">
          <Tabs className="admin-page-layout-tabs" defaultActiveKey={activeTab} animated={false} tabBarGutter={0}>
            <Tabs.TabPane key="system_status" tab={<Link href="admin/status">System Status</Link>}>
              {activeTab === "system_status" ? children : null}
            </Tabs.TabPane>
            <Tabs.TabPane key="jobs" tab={<Link href="admin/queries/jobs">RQ Status</Link>}>
              {activeTab === "jobs" ? children : null}
            </Tabs.TabPane>
            <Tabs.TabPane key="outdated_queries" tab={<Link href="admin/queries/outdated">Outdated Queries</Link>}>
              {activeTab === "outdated_queries" ? children : null}
            </Tabs.TabPane>
          </Tabs>
        </div>
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
