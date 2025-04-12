import React, { useState, useCallback } from "react";
import PropTypes from "prop-types";
import cx from "classnames";

import Modal from "antd/lib/modal";
import Dropdown from "antd/lib/dropdown";
import Menu from "antd/lib/menu";
import Button from "antd/lib/button";

import LoadingOutlinedIcon from "@ant-design/icons/LoadingOutlined";
import EllipsisOutlinedIcon from "@ant-design/icons/EllipsisOutlined";
import PlainButton from "@/components/PlainButton";

export default function MenuButton({ doDelete, canEdit, mute, unmute, evaluate, muted }) {
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
              <PlainButton onClick={() => execute(unmute)}>Unmute Notifications</PlainButton>
            ) : (
              <PlainButton onClick={() => execute(mute)}>Mute Notifications</PlainButton>
            )}
          </Menu.Item>
          <Menu.Item>
            <PlainButton onClick={confirmDelete}>Delete</PlainButton>
          </Menu.Item>
          <Menu.Item>
            <PlainButton onClick={() => execute(evaluate)}>Evaluate</PlainButton>
          </Menu.Item>
        </Menu>
      }>
      <Button aria-label="More actions">
        {loading ? <LoadingOutlinedIcon /> : <EllipsisOutlinedIcon rotate={90} aria-hidden="true" />}
      </Button>
    </Dropdown>
  );
}

MenuButton.propTypes = {
  doDelete: PropTypes.func.isRequired,
  canEdit: PropTypes.bool.isRequired,
  mute: PropTypes.func.isRequired,
  unmute: PropTypes.func.isRequired,
  evaluate: PropTypes.func.isRequired,
  muted: PropTypes.bool,
};

MenuButton.defaultProps = {
  muted: false,
};
