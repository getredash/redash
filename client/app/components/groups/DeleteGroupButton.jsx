import React from 'react';
import PropTypes from 'prop-types';
import Button from 'antd/lib/button';
import Modal from 'antd/lib/modal';
import { toastr } from '@/services/ng';

function deleteGroup(event, group, onGroupDeleted) {
  // prevent default click action on table rows
  event.preventDefault();
  event.stopPropagation();

  Modal.confirm({
    title: 'Delete Group',
    content: 'Are you sure you want to delete this group?',
    okText: 'Yes',
    okType: 'danger',
    cancelText: 'No',
    onOk: () => {
      group.$delete(() => {
        toastr.success('Group deleted successfully.');
        onGroupDeleted();
      });
    },
  });
}

export default function DeleteGroupButton({ group, onClick, children, ...props }) {
  if (!group) {
    return null;
  }
  return (
    <Button {...props} type="danger" onClick={event => deleteGroup(event, group, onClick)}>{children}</Button>
  );
}

DeleteGroupButton.propTypes = {
  group: PropTypes.object, // eslint-disable-line react/forbid-prop-types
  onClick: PropTypes.func,
  children: PropTypes.node,
};

DeleteGroupButton.defaultProps = {
  group: null,
  onClick: () => {},
  children: null,
};
