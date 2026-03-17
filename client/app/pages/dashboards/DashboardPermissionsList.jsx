import React, { useState, useEffect } from "react";
import Button from "antd/lib/button";
import Table from "antd/lib/table";
import Checkbox from "antd/lib/checkbox";
import Spin from "antd/lib/spin";
import message from "antd/lib/message";
import routeWithUserSession from "@/components/ApplicationArea/routeWithUserSession";
import PageHeader from "@/components/PageHeader";
import Layout from "@/components/layouts/ContentWithSidebar";
import * as Sidebar from "@/components/items-list/components/Sidebar";
import { currentUser } from "@/services/auth";
import Group from "@/services/group";
import routes from "@/services/routes";

const sidebarMenu = [
  {
    key: "all",
    href: "dashboards",
    title: "All Dashboards",
    icon: () => <Sidebar.MenuIcon icon="zmdi zmdi-view-quilt" />,
  },
  {
    key: "my",
    href: "dashboards/my",
    title: "My Dashboards",
    icon: () => <Sidebar.ProfileImage user={currentUser} />,
  },
  {
    key: "favorites",
    href: "dashboards/favorites",
    title: "Favorites",
    icon: () => <Sidebar.MenuIcon icon="fa fa-star" />,
  },
  {
    key: "permissions",
    href: "dashboards/permissions",
    title: "Permissions",
    icon: () => <Sidebar.MenuIcon icon="fa fa-lock" />,
  },
];

function DashboardPermissionsList() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dashboards, setDashboards] = useState([]);

  useEffect(() => {
    loadDashboards();
  }, []);

  const loadDashboards = async () => {
    try {
      setLoading(true);
      // Get all groups to show dashboard permissions for each group
      const groupsResponse = await Group.query();
      const groups = groupsResponse || [];

      // Load existing permissions for each group
      const permissionPromises = groups.map(async (group) => {
        try {
          const permissions = await Group.getObjectPermissions({ id: group.id });
          // Find global dashboard permissions (if any)
          const dashboards = permissions.dashboards?.map(d => ({
            group_id: group.id,
            object_id: d.object_id,
            d_name: d.name,
            group_name: group.name,
            can_create: d?.can_create || false,
            can_read: d?.can_read || true,
            can_update: d?.can_update || false,
            can_delete: d?.can_delete || false,
          })) || [];

          return dashboards; // Return the array directly
        } catch (error) {
          // If no permissions found, return empty array
          return [];
        }
      });

      const dashboardPermissions = await Promise.all(permissionPromises);
      setDashboards(dashboardPermissions.flat()); // Flatten the nested arrays

    } catch (error) {
      message.error("Failed to load dashboard permissions");
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (groupId, permission, checked) => {
    setDashboards(prev =>
      prev.map(dashboard =>
        dashboard.group_id === groupId ? { ...dashboard, [permission]: checked } : dashboard
      )
    );
  };

  const savePermissions = async () => {
    try {
      setSaving(true);

      // Save permissions for each group using the group object permissions API
      const savePromises = dashboards.map(dashboard => {
        // Create a payload for this group's dashboard permissions
        const payload = {
          dashboards: [{
            object_id: dashboard.object_id,
            can_create: dashboard.can_create,
            can_read: dashboard.can_read,
            can_update: dashboard.can_update,
            can_delete: dashboard.can_delete,
          }]
        };

        return Group.saveObjectPermissions({ id: dashboard.group_id }, payload);
      });

      await Promise.all(savePromises);
      message.success("Dashboard permissions updated successfully");
    } catch (error) {
      message.error("Failed to save dashboard permissions");
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      title: "Group",
      dataIndex: "group_name",
      key: "group_name",
      width: "15%",
    },
    {
      title: "Dashboard",
      dataIndex: "d_name",
      key: "d_name",
      width: "15%",
    },
    {
      title: "Create",
      key: "can_create",
      width: "17.5%",
      align: "center",
      render: (_, record) => (
        <Checkbox
          checked={record.can_create}
          onChange={e => handlePermissionChange(record.group_id, "can_create", e.target.checked)}
        />
      ),
    },
    {
      title: "Read",
      key: "can_read",
      width: "17.5%",
      align: "center",
      render: (_, record) => (
        <Checkbox
          checked={record.can_read}
          onChange={e => handlePermissionChange(record.group_id, "can_read", e.target.checked)}
        />
      ),
    },
    {
      title: "Update",
      key: "can_update",
      width: "17.5%",
      align: "center",
      render: (_, record) => (
        <Checkbox
          checked={record.can_update}
          onChange={e => handlePermissionChange(record.group_id, "can_update", e.target.checked)}
        />
      ),
    },
    {
      title: "Delete",
      key: "can_delete",
      width: "17.5%",
      align: "center",
      render: (_, record) => (
        <Checkbox
          checked={record.can_delete}
          onChange={e => handlePermissionChange(record.group_id, "can_delete", e.target.checked)}
        />
      ),
    },
  ];

  return (
    <div className="page-dashboard-list">
      <div className="container">
        <PageHeader title="Dashboard Permissions" />
        <Layout>
          <Layout.Sidebar className="m-b-0">
            <Sidebar.Menu items={sidebarMenu} selected="permissions" />
          </Layout.Sidebar>
          <Layout.Content>
            <div className="bg-white tiled">
              {loading ? (
                <div style={{ textAlign: "center", padding: "50px" }}>
                  <Spin size="large" />
                </div>
              ) : (
                <>
                  <div className="p-15">
                    <h4>Group Permissions</h4>
                    <p className="text-muted m-b-15">
                      Configure which groups can create, read, update, or delete dashboards.
                    </p>
                  </div>
                  <Table
                    dataSource={dashboards}
                    columns={columns}
                    rowKey="group_id"
                    pagination={false}
                    size="middle"
                  />
                  <div className="p-15" style={{ textAlign: "right" }}>
                    <Button
                      type="primary"
                      loading={saving}
                      onClick={savePermissions}
                    >
                      Save Permissions
                    </Button>
                  </div>
                </>
              )}
            </div>
          </Layout.Content>
        </Layout>
      </div>
    </div>
  );
}

routes.register(
  "Dashboards.Permissions",
  routeWithUserSession({
    path: "/dashboards/permissions",
    title: "Dashboard Permissions",
    render: () => <DashboardPermissionsList />,
  })
);

export default DashboardPermissionsList;