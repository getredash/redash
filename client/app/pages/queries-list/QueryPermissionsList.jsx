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
    href: "queries",
    title: "All Queries",
    icon: () => <Sidebar.MenuIcon icon="fa fa-code" />,
  },
  {
    key: "my",
    href: "queries/my",
    title: "My Queries",
    icon: () => <Sidebar.ProfileImage user={currentUser} />,
  },
  {
    key: "favorites",
    href: "queries/favorites",
    title: "Favorites",
    icon: () => <Sidebar.MenuIcon icon="fa fa-star" />,
  },
  {
    key: "archive",
    href: "queries/archive",
    title: "Archived",
    icon: () => <Sidebar.MenuIcon icon="fa fa-archive" />,
  },
  {
    key: "permissions",
    href: "queries/permissions",
    title: "Permissions",
    icon: () => <Sidebar.MenuIcon icon="fa fa-lock" />,
  },
];

function QueryPermissionsList() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [queries, setQueries] = useState([]);

  useEffect(() => {
    loadQueries();
  }, []);

  const loadQueries = async () => {
    try {
      setLoading(true);
      const groupsResponse = await Group.query();
      const groups = groupsResponse || [];

      const permissionPromises = groups.map(async (group) => {
        try {
          const permissions = await Group.getObjectPermissions({ id: group.id });
          const queries = permissions.queries?.map(q => ({
            group_id: group.id,
            object_id: q.object_id,
            q_name: q.name,
            group_name: group.name,
            can_create: q?.can_create || false,
            can_read: q?.can_read || false,
            can_update: q?.can_update || false,
            can_delete: q?.can_delete || false,
          })) || [];

          return queries;
        } catch (error) {
          return [];
        }
      });

      const queryPermissions = await Promise.all(permissionPromises);
      setQueries(queryPermissions.flat());

    } catch (error) {
      message.error("Failed to load query permissions");
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (groupId, permission, checked) => {
    setQueries(prev =>
      prev.map(query =>
        query.group_id === groupId ? { ...query, [permission]: checked } : query
      )
    );
  };

  const savePermissions = async () => {
    try {
      setSaving(true);

      const savePromises = queries.map(query => {
        const payload = {
          queries: [{
            object_id: query.object_id,
            can_create: query.can_create,
            can_read: query.can_read,
            can_update: query.can_update,
            can_delete: query.can_delete,
          }]
        };

        return Group.saveObjectPermissions({ id: query.group_id }, payload);
      });

      await Promise.all(savePromises);
      message.success("Query permissions updated successfully");
    } catch (error) {
      message.error("Failed to save query permissions");
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
      title: "Query",
      dataIndex: "q_name",
      key: "q_name",
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
    <div className="page-queries-list">
      <div className="container">
        <PageHeader title="Query Permissions" />
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
                      Configure which groups can create, read, update, or delete queries.
                    </p>
                  </div>
                  <Table
                    dataSource={queries}
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
  "Queries.Permissions",
  routeWithUserSession({
    path: "/queries/permissions",
    title: "Query Permissions",
    render: () => <QueryPermissionsList />,
  })
);

export default QueryPermissionsList;