import React from 'react';
import { each, map, includes, find, get, difference } from 'lodash';
import Tag from 'antd/lib/tag';
import SelectItemsDialog from '@/components/SelectItemsDialog';
import { UserPreviewCard } from '@/components/PreviewCard';
import { User } from '@/services/user';
import { $http } from '@/services/ng';
import { toHuman } from '@/filters';

const loadGrantees = aclUrl => $http.get(aclUrl).then(({ data }) => {
  const resultGrantees = [];
  each(data, (grantees, accessType) => {
    grantees.forEach((grantee) => {
      grantee.accessType = toHuman(accessType);
      resultGrantees.push(grantee);
    });
  });
  return resultGrantees;
});

function showModal({ aclUrl, ownerId }) {
  return loadGrantees(aclUrl).then((grantees) => {
    const usersWithPermissions = [ownerId, ...map(grantees, grantee => grantee.id)];
    return SelectItemsDialog.showModal({
      dialogTitle: 'Manage Permissions',
      inputPlaceholder: 'Search users...',
      selectedItemsTitle: 'Users with permissions',
      searchItems: searchTerm => User.query({ q: searchTerm }).$promise.then(({ results }) => results),
      renderItem: (item, { isSelected }) => ({
        content: (
          <UserPreviewCard user={item}>
            {includes(usersWithPermissions, item.id) && (isSelected ? (
              <Tag>{get(find(grantees, { id: item.id }), 'accessType', 'Owner')}</Tag>
            ) : <Tag><i>Not Saved</i></Tag>)}
            {item.id !== ownerId && <i className="fa fa-angle-double-right" />}
          </UserPreviewCard>
        ),
        className: isSelected ? 'selected' : '',
        isDisabled: isSelected && includes(usersWithPermissions, item.id),
      }),
      renderStagedItem: item => ({
        content: (
          <UserPreviewCard user={item}>
            {includes(usersWithPermissions, item.id) ? (
              <Tag>{get(find(grantees, { id: item.id }), 'accessType', 'Owner')}</Tag>
            ) : <Tag><i>Not Saved</i></Tag>}
            {item.id !== ownerId && <i className="fa fa-remove" />}
          </UserPreviewCard>
        ),
        isDisabled: item.id === ownerId,
      }),
      defaultSelectedItem: item => includes(usersWithPermissions, item.id),
    }).result
      .then((selected) => {
        const selectedIds = map(selected, s => s.id);
        return {
          added: difference(selectedIds, usersWithPermissions),
          removed: difference(usersWithPermissions, selectedIds),
        };
      });
  });
}

export default {
  ...SelectItemsDialog,
  showModal,
};
