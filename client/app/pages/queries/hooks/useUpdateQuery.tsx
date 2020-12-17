import { isNil, isObject, extend, keys, map, omit, pick, uniq, get } from "lodash";
import React, { useCallback } from "react";
import Modal from "antd/lib/modal";
import { Query } from "@/services/query";
import notification from "@/services/notification";
import useImmutableCallback from "@/lib/hooks/useImmutableCallback";
import { policy } from "@/services/policy";
class SaveQueryError extends Error {
    detailedMessage: any;
    constructor(message: any, detailedMessage = null) {
        super(message);
        this.detailedMessage = detailedMessage;
    }
}
class SaveQueryConflictError extends SaveQueryError {
    constructor() {
        // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'Element' is not assignable to pa... Remove this comment to see the full error message
        super("Changes not saved", <React.Fragment>
        <div className="m-b-5">It seems like the query has been modified by another user.</div>
        <div>Please copy/backup your changes and reload this page.</div>
      </React.Fragment>);
    }
}
function confirmOverwrite() {
    return new Promise((resolve, reject) => {
        Modal.confirm({
            title: "Overwrite Query",
            content: (<React.Fragment>
          <div className="m-b-5">It seems like the query has been modified by another user.</div>
          <div>Are you sure you want to overwrite the query with your version?</div>
        </React.Fragment>),
            okText: "Overwrite",
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
function doSaveQuery(data: any, { canOverwrite = false } = {}) {
    // omit parameter properties that don't need to be stored
    if (isObject(data.options) && data.options.parameters) {
        data.options = {
            ...data.options,
            parameters: map(data.options.parameters, p => p.toSaveableObject()),
        };
    }
    return (Query as any).save(data).catch((error: any) => {
        if (get(error, "response.status") === 409) {
            if (canOverwrite) {
                return confirmOverwrite()
                    .then(() => (Query as any).save(omit(data, ["version"])))
                    .catch(() => Promise.reject(new SaveQueryConflictError()));
            }
            return Promise.reject(new SaveQueryConflictError());
        }
        return Promise.reject(new SaveQueryError("Query could not be saved"));
    });
}
export default function useUpdateQuery(query: any, onChange: any) {
    const handleChange = useImmutableCallback(onChange);
    return useCallback((data = null, { successMessage = "Query saved" } = {}) => {
        if (isObject(data)) {
            // Don't save new query with partial data
            if (query.isNew()) {
                handleChange(extend(query.clone(), data));
                return;
            }
            data = { ...data, id: query.id, version: query.version };
        }
        else {
            data = pick(query, [
                "id",
                "version",
                "schedule",
                "query",
                "description",
                "name",
                "data_source_id",
                "options",
                "latest_query_data_id",
                "is_draft",
                "tags",
            ]);
        }
        return doSaveQuery(data, { canOverwrite: policy.canEdit(query) })
            .then((updatedQuery: any) => {
            if (!isNil(successMessage)) {
                notification.success(successMessage);
            }
            handleChange(extend(query.clone(), 
            // if server returned completely new object (currently possible only when saving new query) -
            // update all fields; otherwise pick only changed fields
            updatedQuery.id !== query.id ? updatedQuery : pick(updatedQuery, uniq(["id", "version", ...keys(data)]))));
        })
            .catch((error: any) => {
            const notificationOptions = {};
            if (error instanceof SaveQueryConflictError) {
                (notificationOptions as any).duration = null;
            }
            // @ts-expect-error ts-migrate(2554) FIXME: Expected 1 arguments, but got 3.
            notification.error(error.message, error.detailedMessage, notificationOptions);
        });
    }, [query, handleChange]);
}
