import React, { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { each, debounce, get, find } from "lodash";
import Button from "antd/lib/button";
import List from "antd/lib/list";
import Modal from "antd/lib/modal";
import Select from "antd/lib/select";
import Tag from "antd/lib/tag";
import Tooltip from "antd/lib/tooltip";
import { wrap as wrapDialog, DialogPropType } from "@/components/DialogWrapper";
import { $http } from "@/services/ng";
import { toHuman } from "@/lib/utils";
import HelpTrigger from "@/components/HelpTrigger";
import { UserPreviewCard } from "@/components/PreviewCard";
import notification from "@/services/notification";
import { User } from "@/services/user";

import "./index.less";

const { Option } = Select;
const DEBOUNCE_SEARCH_DURATION = 200;

function useGrantees(url) {
  const loadGrantees = useCallback(
    () =>
      $http.get(url).then(({ data }) => {
        const resultGrantees = [];
        each(data, (grantees, accessType) => {
          grantees.forEach(grantee => {
            grantee.accessType = toHuman(accessType);
            resultGrantees.push(grantee);
          });
        });
        return resultGrantees;
      }),
    [url]
  );

  const addPermission = useCallback(
    (userId, accessType = "modify") =>
      $http
        .post(url, { access_type: accessType, user_id: userId })
        .catch(() => notification.error("Could not grant permission to the user")),
    [url]
  );

  const removePermission = useCallback(
    (userId, accessType = "modify") =>
      $http
        .delete(url, { data: { access_type: accessType, user_id: userId } })
        .catch(() => notification.error("Could not remove permission from the user")),
    [url]
  );

  return { loadGrantees, addPermission, removePermission };
}

const searchUsers = searchTerm =>
  User.query({ q: searchTerm })
    .$promise.then(({ results }) => results)
    .catch(() => []);

function PermissionsEditorDialogHeader({ context }) {
  return (
    <>
      Manage Permissions
      <div className="modal-header-desc">
        {`Editing this ${context} is enabled for the users in this list and for admins. `}
        <HelpTrigger type="MANAGE_PERMISSIONS" />
      </div>
    </>
  );
}

PermissionsEditorDialogHeader.propTypes = { context: PropTypes.oneOf(["query", "dashboard"]) };
PermissionsEditorDialogHeader.defaultProps = { context: "query" };

function UserSelect({ onSelect, shouldShowUser }) {
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const debouncedSearchUsers = useCallback(
    debounce(
      search =>
        searchUsers(search)
          .then(setUsers)
          .finally(() => setLoadingUsers(false)),
      DEBOUNCE_SEARCH_DURATION
    ),
    []
  );

  useEffect(() => {
    setLoadingUsers(true);
    debouncedSearchUsers(searchTerm);
  }, [debouncedSearchUsers, searchTerm]);

  return (
    <Select
      className="w-100 m-b-10"
      placeholder="Add users..."
      showSearch
      onSearch={setSearchTerm}
      suffixIcon={loadingUsers ? <i className="fa fa-spinner fa-pulse" /> : <i className="fa fa-search" />}
      filterOption={false}
      notFoundContent={null}
      value={undefined}
      getPopupContainer={trigger => trigger.parentNode}
      onSelect={onSelect}>
      {users.filter(shouldShowUser).map(user => (
        <Option key={user.id} value={user.id}>
          <UserPreviewCard user={user} />
        </Option>
      ))}
    </Select>
  );
}

UserSelect.propTypes = {
  onSelect: PropTypes.func,
  shouldShowUser: PropTypes.func,
};
UserSelect.defaultProps = { onSelect: () => {}, shouldShowUser: () => true };

function PermissionsEditorDialog({ dialog, author, context, aclUrl }) {
  const [loadingGrantees, setLoadingGrantees] = useState(true);
  const [grantees, setGrantees] = useState([]);
  const { loadGrantees, addPermission, removePermission } = useGrantees(aclUrl);
  const loadUsersWithPermissions = useCallback(() => {
    setLoadingGrantees(true);
    loadGrantees()
      .then(setGrantees)
      .catch(() => notification.error("Failed to load grantees list"))
      .finally(() => setLoadingGrantees(false));
  }, [loadGrantees]);

  const userHasPermission = useCallback(
    user => user.id === author.id || !!get(find(grantees, { id: user.id }), "accessType"),
    [author.id, grantees]
  );

  useEffect(() => {
    loadUsersWithPermissions();
  }, [aclUrl, loadUsersWithPermissions]);

  return (
    <Modal
      {...dialog.props}
      className="permissions-editor-dialog"
      title={<PermissionsEditorDialogHeader context={context} />}
      footer={<Button onClick={dialog.dismiss}>Close</Button>}>
      <UserSelect
        onSelect={userId => addPermission(userId).then(loadUsersWithPermissions)}
        shouldShowUser={user => !userHasPermission(user)}
      />
      <div className="d-flex align-items-center m-t-5">
        <h5 className="flex-fill">Users with permissions</h5>
        {loadingGrantees && <i className="fa fa-spinner fa-pulse" />}
      </div>
      <div className="scrollbox p-5" style={{ maxHeight: "40vh" }}>
        <List
          size="small"
          dataSource={[author, ...grantees]}
          renderItem={user => (
            <List.Item>
              <UserPreviewCard key={user.id} user={user}>
                {user.id === author.id ? (
                  <Tag className="m-0">Author</Tag>
                ) : (
                  <Tooltip title="Remove user permissions">
                    <i
                      className="fa fa-remove clickable"
                      onClick={() => removePermission(user.id).then(loadUsersWithPermissions)}
                    />
                  </Tooltip>
                )}
              </UserPreviewCard>
            </List.Item>
          )}
        />
      </div>
    </Modal>
  );
}

PermissionsEditorDialog.propTypes = {
  dialog: DialogPropType.isRequired,
  author: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  context: PropTypes.oneOf(["query", "dashboard"]),
  aclUrl: PropTypes.string.isRequired,
};

PermissionsEditorDialog.defaultProps = { context: "query" };

export default wrapDialog(PermissionsEditorDialog);
