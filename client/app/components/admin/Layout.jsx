import React from "react";
import PropTypes from "prop-types";
import Menu from "antd/lib/menu";
import PageHeader from "@/components/PageHeader";
import Link from "@/components/Link";

import "./layout.less";

export default function Layout({ activeTab, children }) {
  return (
    <div className="admin-page-layout">
      <div className="container">
        <PageHeader title="Admin" />
        <div className="bg-white tiled">
          <Menu selectedKeys={[activeTab]} selectable={false} mode="horizontal">
            <Menu.Item key="system_status">
              <Link href="admin/status">System Status</Link>
            </Menu.Item>
            <Menu.Item key="jobs">
              <Link href="admin/queries/jobs">RQ Status</Link>
            </Menu.Item>
            <Menu.Item key="outdated_queries">
              <Link href="admin/queries/outdated">Outdated Queries</Link>
            </Menu.Item>
          </Menu>
          {children}
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
