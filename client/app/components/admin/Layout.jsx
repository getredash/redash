import React from "react";
import PropTypes from "prop-types";
import Menu from "antd/lib/menu";
import PageHeader from "@/components/PageHeader";
import Link from "@/components/Link";

import "./layout.less";

export default function Layout({ activeTab = "system_status", children = null }) {
  const items = [
    {
      key: "system_status",
      label: <Link href="admin/status">System Status</Link>,
    },
    {
      key: "jobs",
      label: <Link href="admin/queries/jobs">RQ Status</Link>,
    },
    {
      key: "outdated_queries",
      label: <Link href="admin/queries/outdated">Outdated Queries</Link>,
    },
  ];

  return (
    <div className="admin-page-layout">
      <div className="container">
        <PageHeader title="Admin" />
        <div className="bg-white tiled">
          <Menu selectedKeys={[activeTab]} selectable={false} mode="horizontal" items={items} />
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
