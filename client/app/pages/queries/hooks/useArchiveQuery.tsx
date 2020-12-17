import { extend } from "lodash";
import React, { useCallback } from "react";
import Modal from "antd/lib/modal";
import { Query } from "@/services/query";
import notification from "@/services/notification";
import useImmutableCallback from "@/lib/hooks/useImmutableCallback";
function confirmArchive() {
    return new Promise((resolve, reject) => {
        Modal.confirm({
            title: "Archive Query",
            content: (<React.Fragment>
          <div className="m-b-5">Are you sure you want to archive this query?</div>
          <div>All alerts and dashboard widgets created with its visualizations will be deleted.</div>
        </React.Fragment>),
            okText: "Archive",
            okType: "danger",
            onOk: () => {
                // @ts-expect-error ts-migrate(2794) FIXME: Expected 1 arguments, but got 0. Did you forget to... Remove this comment to see the full error message
                resolve();
            },
            onCancel: () => {
                reject();
            },
            maskClosable: true,
            autoFocusButton: null,
        });
    });
}
function doArchiveQuery(query: any) {
    return (Query as any).delete({ id: query.id })
        .then(() => {
        return extend(query.clone(), { is_archived: true, schedule: null });
    })
        .catch((error: any) => {
        // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'string' is not assignable to par... Remove this comment to see the full error message
        notification.error("Query could not be archived.");
        return Promise.reject(error);
    });
}
export default function useArchiveQuery(query: any, onChange: any) {
    const handleChange = useImmutableCallback(onChange);
    return useCallback(() => {
        confirmArchive()
            .then(() => doArchiveQuery(query))
            .then(handleChange);
    }, [query, handleChange]);
}
