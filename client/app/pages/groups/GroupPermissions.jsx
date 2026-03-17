import React, { useState, useEffect, useCallback } from "react";
import Table from "antd/lib/table";
import Checkbox from "antd/lib/checkbox";
import Button from "antd/lib/button";
import Spin from "antd/lib/spin";
import message from "antd/lib/message";
import routeWithUserSession from "@/components/ApplicationArea/routeWithUserSession";
import navigateTo from "@/components/ApplicationArea/navigateTo";
import GroupName from "@/components/groups/GroupName";
import Sidebar from "@/components/groups/DetailsPageSidebar";
import Layout from "@/components/layouts/ContentWithSidebar";
import wrapSettingsTab from "@/components/SettingsWrapper";
import { currentUser } from "@/services/auth";
import Group from "@/services/group";
import routes from "@/services/routes";

function GroupQueryPermissions({ routeParams = {}, currentPage }) {
  const groupId = parseInt(routeParams.groupId || window.location.pathname.split('/')[2], 10);
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assignedQueries, setAssignedQueries] = useState([]);

  const sidebarMenu = [
    {
      key: "users",
      href: `groups/${groupId}`,
      title: "Members",
    },
    {
      key: "datasources",
      href: `groups/${groupId}/data_sources`,
      title: "Data Sources",
      isAvailable: () => currentUser.isAdmin,
    },
    {
      key: "query_permissions",
      href: `groups/${groupId}/query_permissions`,
      title: "Query Permissions",
      isAvailable: () => currentUser.isAdmin,
    },
    {
      key: "dashboard_permissions",
      href: `groups/${groupId}/dashboard_permissions`,
      title: "Dashboard Permissions",
      isAvailable: () => currentUser.isAdmin,
    },
  ];

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [groupData, permissionsData] = await Promise.all([
        Group.get({ id: groupId }),
        Group.getObjectPermissions({ id: groupId })
      ]);
      
      setGroup(groupData);
      setAssignedQueries(permissionsData.queries || []);
    } catch (error) {
      message.error("Failed to load query permissions");
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePermissionChange = (itemId, permission, checked) => {
    setAssignedQueries(prev => 
      prev.map(item => 
        item.object_id === itemId ? { ...item, [permission]: checked } : item
      )
    );
  };

  const savePermissions = async () => {
    try {
      setSaving(true);
      await Group.saveObjectPermissions({ id: groupId }, { queries: assignedQueries });
      message.success("Query permissions updated successfully");
    } catch (error) {
      message.error("Failed to save query permissions");
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      title: "Query Name",
      dataIndex: "name",
      key: "name",
      width: "40%",
    },
    {
      title: "Create",
      key: "can_create",
      width: "15%",
      align: "center",
      render: (_, record) => (
        <Checkbox
          checked={record.can_create}
          onChange={e => handlePermissionChange(record.object_id, "can_create", e.target.checked)}
        />
      ),
    },
    {
      title: "Read",
      key: "can_read",
      width: "15%",
      align: "center",
      render: (_, record) => (
        <Checkbox
          checked={record.can_read}
          onChange={e => handlePermissionChange(record.object_id, "can_read", e.target.checked)}
        />
      ),
    },
    {
      title: "Update",
      key: "can_update",
      width: "15%",
      align: "center",
      render: (_, record) => (
        <Checkbox
          checked={record.can_update}
          onChange={e => handlePermissionChange(record.object_id, "can_update", e.target.checked)}
        />
      ),
    },
    {
      title: "Delete",
      key: "can_delete",
      width: "15%",
      align: "center",
      render: (_, record) => (
        <Checkbox
          checked={record.can_delete}
          onChange={e => handlePermissionChange(record.object_id, "can_delete", e.target.checked)}
        />
      ),
    },
  ];

  if (loading) {
    return (
      <div className="text-center p-t-50">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div data-test="Group">
      <GroupName className="d-block m-t-0 m-b-15" group={group} onChange={() => setGroup({ ...group })} />
      <Layout>
        <Layout.Sidebar>
          <Sidebar
            controller={{ params: { currentPage } }}
            group={group}
            items={sidebarMenu}
            onGroupDeleted={() => navigateTo("groups")}
          />
        </Layout.Sidebar>
        <Layout.Content>
          <div className="bg-white tiled">
            <div className="p-15">
              <h4>Query Permissions</h4>
              <p className="text-muted m-b-15">
                Manage CRUD permissions for queries assigned to this group ({assignedQueries.length} queries).
              </p>
            </div>
            
            <Table
              dataSource={assignedQueries}
              columns={columns}
              rowKey="object_id"
              pagination={{ pageSize: 10 }}
              size="middle"
            />
            
            <div className="p-15" style={{ textAlign: "right", borderTop: "1px solid #e8e8e8" }}>
              <Button
                type="primary"
                loading={saving}
                onClick={savePermissions}
                size="large"
              >
                Save Query Permissions
              </Button>
            </div>
          </div>
        </Layout.Content>
      </Layout>
    </div>
  );
}

const GroupQueryPermissionsPage = wrapSettingsTab(
  "Groups.QueryPermissions",
  null,
  GroupQueryPermissions
);

routes.register(
  "Groups.QueryPermissions",
  routeWithUserSession({
    path: "/groups/:groupId/query_permissions",
    title: "Group Query Permissions",
    render: pageProps => <GroupQueryPermissionsPage {...pageProps} currentPage="query_permissions" />,
  })
);

export default GroupQueryPermissions;