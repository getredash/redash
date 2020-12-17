import { isString } from "lodash";
import React from "react";
import Button from "antd/lib/button";
import Modal from "antd/lib/modal";
import Tooltip from "antd/lib/tooltip";
import notification from "@/services/notification";
import Group from "@/services/group";

function deleteGroup(event: any, group: any, onGroupDeleted: any) {
  Modal.confirm({
    title: "Delete Group",
    content: "Are you sure you want to delete this group?",
    okText: "Yes",
    okType: "danger",
    cancelText: "No",
    onOk: () => {
      Group.delete(group).then(() => {
        // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'string' is not assignable to par... Remove this comment to see the full error message
        notification.success("Group deleted successfully.");
        onGroupDeleted();
      });
    },
  });
}

type OwnProps = {
    group?: any;
    title?: string;
    onClick?: (...args: any[]) => any;
    children?: React.ReactNode;
};

type Props = OwnProps & typeof DeleteGroupButton.defaultProps;

// @ts-expect-error ts-migrate(2700) FIXME: Rest types may only be created from object types.
export default function DeleteGroupButton({ group, title, onClick, children, ...props }: Props) {
  if (!group) {
    return null;
  }
  const button = (
    <Button {...props} type="danger" onClick={event => deleteGroup(event, group, onClick)}>
      {children}
    </Button>
  );

  if (isString(title) && title !== "") {
    return (
      <Tooltip placement="top" title={title} mouseLeaveDelay={0}>
        {button}
      </Tooltip>
    );
  }

  return button;
}

DeleteGroupButton.defaultProps = {
  group: null,
  title: null,
  onClick: () => {},
  children: null,
};
