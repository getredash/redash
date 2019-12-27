import { extend } from "lodash";
import React, { useMemo, useState, useCallback } from "react";
import PropTypes from "prop-types";
import Modal from "antd/lib/modal";
import Input from "antd/lib/input";
import Button from "antd/lib/button";
import { wrap as wrapDialog, DialogPropType } from "@/components/DialogWrapper";
import CodeBlock from "@/components/CodeBlock";
import { $http } from "@/services/ng";
import { clientConfig } from "@/services/auth";
import notification from "@/services/notification";

import "./index.less";

function ApiKeyDialog({ dialog, ...props }) {
  const [query, setQuery] = useState(props.query);
  const [updatingApiKey, setUpdatingApiKey] = useState(false);

  const regenerateQueryApiKey = useCallback(() => {
    setUpdatingApiKey(true);
    $http
      .post(`api/queries/${query.id}/regenerate_api_key`)
      .success(data => {
        setUpdatingApiKey(false);
        setQuery(extend(query.clone(), { api_key: data.api_key }));
      })
      .error(() => {
        setUpdatingApiKey(false);
        notification.error("Failed to update API key");
      });
  }, [query]);

  const { csvUrl, jsonUrl } = useMemo(
    () => ({
      csvUrl: `${clientConfig.basePath}api/queries/${query.id}/results.csv?api_key=${query.api_key}`,
      jsonUrl: `${clientConfig.basePath}api/queries/${query.id}/results.json?api_key=${query.api_key}`,
    }),
    [query.id, query.api_key]
  );

  return (
    <Modal {...dialog.props} width={600} footer={<Button onClick={() => dialog.close(query)}>Close</Button>}>
      <div className="query-api-key-dialog-wrapper">
        <h5>API Key</h5>
        <div className="m-b-20">
          <Input.Group compact>
            <Input readOnly value={query.api_key} />
            {query.can_edit && (
              <Button disabled={updatingApiKey} loading={updatingApiKey} onClick={regenerateQueryApiKey}>
                Regenerate
              </Button>
            )}
          </Input.Group>
        </div>

        <h5>Example API Calls:</h5>
        <div className="m-b-10">
          <label>Results in CSV format:</label>
          <CodeBlock copyable>{csvUrl}</CodeBlock>
        </div>
        <div>
          <label>Results in JSON format:</label>
          <CodeBlock copyable>{jsonUrl}</CodeBlock>
        </div>
      </div>
    </Modal>
  );
}

ApiKeyDialog.propTypes = {
  dialog: DialogPropType.isRequired,
  query: PropTypes.shape({
    id: PropTypes.number.isRequired,
    api_key: PropTypes.string,
    can_edit: PropTypes.bool,
  }).isRequired,
};

export default wrapDialog(ApiKeyDialog);
