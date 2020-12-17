import { extend } from "lodash";
import React, { useMemo, useState, useCallback } from "react";
import Modal from "antd/lib/modal";
import Input from "antd/lib/input";
import Button from "antd/lib/button";
// @ts-expect-error ts-migrate(6133) FIXME: 'DialogPropType' is declared but its value is neve... Remove this comment to see the full error message
import { wrap as wrapDialog, DialogPropType } from "@/components/DialogWrapper";
import CodeBlock from "@/components/CodeBlock";
import { axios } from "@/services/axios";
import { clientConfig } from "@/services/auth";
import notification from "@/services/notification";
import "./index.less";
import { policy } from "@/services/policy";
type Props = {
    // @ts-expect-error ts-migrate(2749) FIXME: 'DialogPropType' refers to a value, but is being u... Remove this comment to see the full error message
    dialog: DialogPropType;
    query: {
        id: number;
        api_key?: string;
        can_edit?: boolean;
    };
};
function ApiKeyDialog({ dialog, ...props }: Props) {
    const [query, setQuery] = useState(props.query);
    const [updatingApiKey, setUpdatingApiKey] = useState(false);
    const regenerateQueryApiKey = useCallback(() => {
        setUpdatingApiKey(true);
        axios
            .post(`api/queries/${query.id}/regenerate_api_key`)
            .then(data => {
            setUpdatingApiKey(false);
            setQuery(extend((query as any).clone(), { api_key: (data as any).api_key }));
        })
            .catch(() => {
            setUpdatingApiKey(false);
            // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'string' is not assignable to par... Remove this comment to see the full error message
            notification.error("Failed to update API key");
        });
    }, [query]);
    const { csvUrl, jsonUrl } = useMemo(() => ({
        csvUrl: `${(clientConfig as any).basePath}api/queries/${query.id}/results.csv?api_key=${query.api_key}`,
        jsonUrl: `${(clientConfig as any).basePath}api/queries/${query.id}/results.json?api_key=${query.api_key}`,
    }), [query.id, query.api_key]);
    return (<Modal {...dialog.props} width={600} footer={<Button onClick={() => dialog.close(query)}>Close</Button>}>
      <div className="query-api-key-dialog-wrapper">
        <h5>API Key</h5>
        <div className="m-b-20">
          <Input.Group compact>
            <Input readOnly value={query.api_key}/>
            {policy.canEdit(query) && (<Button disabled={updatingApiKey} loading={updatingApiKey} onClick={regenerateQueryApiKey}>
                Regenerate
              </Button>)}
          </Input.Group>
        </div>

        <h5>Example API Calls:</h5>
        <div className="m-b-10">
          <label>Results in CSV format:</label>
          {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'null | un... Remove this comment to see the full error message */}
          <CodeBlock copyable>{csvUrl}</CodeBlock>
        </div>
        <div>
          <label>Results in JSON format:</label>
          {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'null | un... Remove this comment to see the full error message */}
          <CodeBlock copyable>{jsonUrl}</CodeBlock>
        </div>
      </div>
    </Modal>);
}
export default wrapDialog(ApiKeyDialog);
