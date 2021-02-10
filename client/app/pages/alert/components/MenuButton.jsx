import React, { useState, useCallback } from "react";
import PropTypes from "prop-types";
import cx from "classnames";

import Modal from "antd/lib/modal";
import Dropdown from "antd/lib/dropdown";
import Menu from "antd/lib/menu";
import Button from "@/components/Button";

import LoadingOutlinedIcon from "@ant-design/icons/LoadingOutlined";
import EllipsisOutlinedIcon from "@ant-design/icons/EllipsisOutlined";
import Link from "@/components/Link";

export default function MenuButton({ doDelete, canEdit, mute, unmute, muted }) {
  const [loading, setLoading] = useState(false);

  const execute = useCallback(action => {
    setLoading(true);
    action().finally(() => {
      setLoading(false);
    });
  }, []);

  const confirmDelete = useCallback(() => {
    Modal.confirm({
      title: "Delete Alert",
      content: "Are you sure you want to delete this alert?",
      okText: "Delete",
      okType: "danger",
      onOk: () => {
        setLoading(true);
        doDelete().catch(() => {
          setLoading(false);
        });
      },
      maskClosable: true,
      autoFocusButton: null,
    });
  }, [doDelete]);

  return (
    <Dropdown
      className={cx("m-l-5", { disabled: !canEdit })}
      trigger={[canEdit ? "click" : undefined]}
      placement="bottomRight"
      overlay={
        <Menu>
          <Menu.Item>
            {muted ? (
              <Link role="button" onClick={() => execute(unmute)}>
                Unmute Notifications
              </Link>
            ) : (
              <Link role="button" onClick={() => execute(mute)}>
                Mute Notifications
              </Link>
            )}
          </Menu.Item>
          <Menu.Item>
            <Link role="button" onClick={confirmDelete}>
              Delete
            </Link>
          </Menu.Item>
        </Menu>
      }>
      <Button>{loading ? <LoadingOutlinedIcon /> : <EllipsisOutlinedIcon rotate={90} />}</Button>
    </Dropdown>
  );
}

MenuButton.propTypes = {
  doDelete: PropTypes.func.isRequired,
  canEdit: PropTypes.bool.isRequired,
  mute: PropTypes.func.isRequired,
  unmute: PropTypes.func.isRequired,
  muted: PropTypes.bool,
};

MenuButton.defaultProps = {
  muted: false,
};
