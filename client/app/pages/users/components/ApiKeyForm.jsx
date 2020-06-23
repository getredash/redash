import React, { useState, useRef, useCallback } from "react";
import PropTypes from "prop-types";
import Button from "antd/lib/button";
import Form from "antd/lib/form";
import Modal from "antd/lib/modal";
import InputWithCopy from "@/components/InputWithCopy";
import { UserProfile } from "@/components/proptypes";
import User from "@/services/user";

export default function ApiKeyForm({ user, onChange }) {
  const [loading, setLoading] = useState(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const regenerateApiKey = useCallback(() => {
    const doRegenerate = () => {
      setLoading(true);
      User.regenerateApiKey(user)
        .then(apiKey => {
          if (apiKey) {
            onChangeRef.current({ ...user, apiKey });
          }
        })
        .finally(() => {
          setLoading(false);
        });
    };

    Modal.confirm({
      title: "Regenerate API Key",
      content: "Are you sure you want to regenerate?",
      okText: "Regenerate",
      onOk: doRegenerate,
      maskClosable: true,
      autoFocusButton: null,
    });
  }, [user]);

  return (
    <Form layout="vertical">
      <hr />
      <Form.Item label="API Key" className="m-b-10">
        <InputWithCopy id="apiKey" className="hide-in-percy" value={user.apiKey} data-test="ApiKey" readOnly />
      </Form.Item>
      <Button className="w-100" onClick={regenerateApiKey} loading={loading} data-test="RegenerateApiKey">
        Regenerate
      </Button>
    </Form>
  );
}

ApiKeyForm.propTypes = {
  user: UserProfile.isRequired,
  onChange: PropTypes.func,
};

ApiKeyForm.defaultProps = {
  onChange: () => {},
};
