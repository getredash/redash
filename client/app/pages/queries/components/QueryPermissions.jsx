import React, { useState, useEffect, useCallback } from "react";
import Table from "antd/lib/table";
import Checkbox from "antd/lib/checkbox";
import Button from "antd/lib/button";
import Spin from "antd/lib/spin";
import message from "antd/lib/message";
import QueryPermissions from "@/services/query-permissions";
import Group from "@/services/group";

function QueryPermissionsComponent({ queryId }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [permissions, setPermissions] = useState([]);

  const loadPermissions = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get all groups first
      const groupsResponse = await Group.query();
      const groups = groupsResponse || [];
      
      // Get existing permissions for this query
      let existingPermissions = [];
      try {
        const response = await QueryPermissions.getPermissions({ id: queryId });
        existingPermissions = response.permissions || [];
      } catch (error) {
        // If no permissions exist, that's fine - we'll show empty checkboxes
      }
      
      // Create a map of existing permissions by group_id
      const permissionMap = {};
      existingPermissions.forEach(perm => {
        permissionMap[perm.group_id] = perm;
      });
      
      // Build permissions array with all groups
      const allPermissions = groups.map(group => {
        const existingPerm = permissionMap[group.id];
        return {
          group_id: group.id,
          group_name: group.name,
          can_create: existingPerm?.can_create || false,
          can_read: existingPerm?.can_read || false,
          can_update: existingPerm?.can_update || false,
          can_delete: existingPerm?.can_delete || false,
        };
      });
      
      setPermissions(allPermissions);
    } catch (error) {
      message.error("Failed to load query permissions");
    } finally {
      setLoading(false);
    }
  }, [queryId]);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  const handlePermissionChange = (groupId, permission, checked) => {
    setPermissions(prev =>
      prev.map(perm =>
        perm.group_id === groupId ? { ...perm, [permission]: checked } : perm
      )
    );
  };

  const savePermissions = async () => {
    try {
      setSaving(true);
      await QueryPermissions.savePermissions({ id: queryId }, { permissions });
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
          onChange={e => handlePermissionChange(record.group_id, "can_create", e.target.checked)}
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
          onChange={e => handlePermissionChange(record.group_id, "can_read", e.target.checked)}
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
          onChange={e => handlePermissionChange(record.group_id, "can_update", e.target.checked)}
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
          onChange={e => handlePermissionChange(record.group_id, "can_delete", e.target.checked)}
        />
      ),
    },
  ];

  if (loading) {
    return (
      <div className="text-center p-15">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <div className="p-15">
        <p className="text-muted m-b-15">
          Configure which groups can create, read, update, or delete this query.
        </p>
      </div>
      
      <Table
        dataSource={permissions}
        columns={columns}
        rowKey="group_id"
        pagination={false}
        size="middle"
      />
      
      <div className="p-15" style={{ textAlign: "right", borderTop: "1px solid #e8e8e8" }}>
        <Button
          type="primary"
          loading={saving}
          onClick={savePermissions}
          size="large"
        >
          Save Permissions
        </Button>
      </div>
    </div>
  );
}

export default QueryPermissionsComponent;