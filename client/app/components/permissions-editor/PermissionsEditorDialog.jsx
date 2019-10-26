import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { each, debounce, get, find } from 'lodash';
import Button from 'antd/lib/button';
import List from 'antd/lib/list';
import Modal from 'antd/lib/modal';
import Select from 'antd/lib/select';
import Tag from 'antd/lib/tag';
import Tooltip from 'antd/lib/tooltip';
import { wrap as wrapDialog, DialogPropType } from '@/components/DialogWrapper';
import LoadingState from '@/components/items-list/components/LoadingState';
import { $http } from '@/services/ng';
import { toHuman } from '@/filters';
import HelpTrigger from '@/components/HelpTrigger';
import { UserPreviewCard } from '@/components/PreviewCard';
import notification from '@/services/notification';
import { User } from '@/services/user';

import './PermissionsEditorDialog.less';

const { Option } = Select;
const DEBOUNCE_SEARCH_DURATION = 200;

function useGrantees(url) {
  const loadGrantees = useCallback(() => $http.get(url).then(({ data }) => {
    const resultGrantees = [];
    each(data, (grantees, accessType) => {
      grantees.forEach((grantee) => {
        grantee.accessType = toHuman(accessType);
        resultGrantees.push(grantee);
      });
    });
    return resultGrantees;
  }), [url]);

  const addPermission = useCallback((userId, accessType = 'modify') => $http.post(
    url, { access_type: accessType, user_id: userId },
  ).catch(() => notification.error('Could not grant permission to the user'), [url]));

  const removePermission = useCallback((userId, accessType = 'modify') => $http.delete(
    url, { data: { access_type: accessType, user_id: userId } },
  ).catch(() => notification.error('Could not remove permission from the user')), [url]);

  return { loadGrantees, addPermission, removePermission };
}

const searchUsers = searchTerm => User.query({ q: searchTerm }).$promise
  .then(({ results }) => results)
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

PermissionsEditorDialogHeader.propTypes = { context: PropTypes.oneOf(['query', 'dashboard']) };
PermissionsEditorDialogHeader.defaultProps = { context: 'query' };

function UserSelect({ onSelect, previewCardAddon, isUserDisabled }) {
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const debouncedSearchUsers = useCallback(debounce(
    search => searchUsers(search)
      .then(setUsers)
      .finally(() => setLoadingUsers(false)),
    DEBOUNCE_SEARCH_DURATION,
  ), []);

  useEffect(() => {
    setLoadingUsers(true);
    debouncedSearchUsers(searchTerm);
  }, [searchTerm]);

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
      onSelect={onSelect}
    >
      {users.map(user => (
        <Option key={user.id} value={user.id} disabled={isUserDisabled(user)}>
          <UserPreviewCard user={user}>
            {previewCardAddon(user)}
          </UserPreviewCard>
        </Option>
      ))}
    </Select>
  );
}

UserSelect.propTypes = {
  onSelect: PropTypes.func,
  previewCardAddon: PropTypes.func,
  isUserDisabled: PropTypes.func,
};
UserSelect.defaultProps = { onSelect: () => {}, previewCardAddon: () => null, isUserDisabled: () => false };

function PermissionsEditorDialog({ dialog, owner, context, aclUrl }) {
  const [loadingGrantees, setLoadingGrantees] = useState(true);
  const [grantees, setGrantees] = useState([]);
  const { loadGrantees, addPermission, removePermission } = useGrantees(aclUrl);
  const loadUsersWithPermissions = useCallback(() => {
    setLoadingGrantees(true);
    loadGrantees()
      .then(setGrantees)
      .catch(() => notification.error('Failed to load grantees list'))
      .finally(() => setLoadingGrantees(false));
  }, []);

  const userHasPermission = useCallback(
    user => (user.id === owner.id || !!get(find(grantees, { id: user.id }), 'accessType')),
    [grantees],
  );

  useEffect(() => {
    loadUsersWithPermissions();
  }, [aclUrl]);

  return (
    <Modal
      {...dialog.props}
      className="permissions-editor-dialog"
      title={<PermissionsEditorDialogHeader context={context} />}
      footer={(<Button onClick={dialog.dismiss}>Close</Button>)}
    >
      <UserSelect
        onSelect={userId => addPermission(userId).then(loadUsersWithPermissions)}
        previewCardAddon={user => (userHasPermission(user) ? '(already has permission)' : null)}
        isUserDisabled={user => userHasPermission(user)}
      />
      <h5>Users with permissions</h5>
      {!loadingGrantees ? (
        <div className="scrollbox p-5 m-t-10" style={{ maxHeight: '40vh' }}>
          <List
            size="small"
            dataSource={[owner, ...grantees]}
            renderItem={user => (
              <List.Item>
                <UserPreviewCard key={user.id} user={user}>
                  {user.id === owner.id ? (<Tag>Owner</Tag>) : (
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
      ) : <LoadingState className="" />}
    </Modal>
  );
}

PermissionsEditorDialog.propTypes = {
  dialog: DialogPropType.isRequired,
  owner: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  context: PropTypes.oneOf(['query', 'dashboard']),
  aclUrl: PropTypes.string.isRequired,
};

PermissionsEditorDialog.defaultProps = { context: 'query' };

export default wrapDialog(PermissionsEditorDialog);
