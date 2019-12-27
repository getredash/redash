import { extend, isFunction } from "lodash";
import React, { useCallback, useRef } from "react";
import Modal from "antd/lib/modal";
import { Query } from "@/services/query";
import notification from "@/services/notification";

function confirmArchive() {
  return new Promise((resolve, reject) => {
    Modal.confirm({
      title: "Archive Query",
      content: (
        <React.Fragment>
          <div className="m-b-5">Are you sure you want to archive this query?</div>
          <div>All alerts and dashboard widgets created with its visualizations will be deleted.</div>
        </React.Fragment>
      ),
      okText: "Archive",
      okType: "danger",
      onOk: () => {
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

function doArchiveQuery(query) {
  return Query.delete({ id: query.id })
    .$promise.then(() => {
      return extend(query.clone(), { is_archived: true, schedule: null });
    })
    .catch(error => {
      notification.error("Query could not be archived.");
      return Promise.reject(error);
    });
}

export default function useArchiveQuery(query, onChange) {
  const onChangeRef = useRef();
  onChangeRef.current = isFunction(onChange) ? onChange : () => {};

  return useCallback(() => {
    confirmArchive()
      .then(() => doArchiveQuery(query))
      .then(updatedQuery => {
        onChangeRef.current(updatedQuery);
      });
  }, [query]);
}
