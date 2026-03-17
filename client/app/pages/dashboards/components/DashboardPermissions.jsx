import React, { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import Table from "antd/lib/table";
import Checkbox from "antd/lib/checkbox";
import Button from "antd/lib/button";
import Spin from "antd/lib/spin";
import message from "antd/lib/message";
import DashboardPermissionsService from "@/services/dashboard-permissions";

function DashboardPermissions({ dashboard }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [permissions, setPermissions] = useState([]);

  const loadPermissions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await DashboardPermissionsService.getPermissions({ id: dashboard.id });
      setPermissions(response.permissions || []);
    } catch (error) {
      message.error("Failed to load permissions");
    } finally {
      setLoading(false);
    }
  }, [dashboard.id]);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  const handlePermissionChange = (groupId, permission, checked) => {
    setPermissions(prev =>
      prev.map(p =>
        p.group_id === groupId ? { ...p, [permission]: checked } : p
      )
    );
  };

  const savePermissions = async () => {
    try {
      setSaving(true);
      await DashboardPermissionsService.savePermissions({ id: dashboard.id }, { permissions });
      message.success("Permissions updated successfully");
    } catch (error) {
      message.error("Failed to save permissions");
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      title: "Group",
      dataIndex: "group_name",
      key: "group_name",
      width: "30%",
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

  if (loading) {
    return (
      <div className="p-15 bg-white tiled" style={{ textAlign: "center" }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="p-15 bg-white tiled">
      <div className="m-b-15">
        <h4>Dashboard Permissions</h4>
        <p className="text-muted">
          Configure which groups can create, read, update, or delete this dashboard.
        </p>
      </div>
      
      <Table
        dataSource={permissions}
        columns={columns}
        rowKey="group_id"
        pagination={false}
        size="middle"
      />
      
      <div className="m-t-15" style={{ textAlign: "right" }}>
        <Button
          type="primary"
          loading={saving}
          onClick={savePermissions}
          disabled={loading}
        >
          Save Permissions
        </Button>
      </div>
    </div>
  );
}

DashboardPermissions.propTypes = {
  dashboard: PropTypes.object.isRequired,
};

export default DashboardPermissions;