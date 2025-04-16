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
    .then(() => {
      return extend(query.clone(), { is_archived: true, schedule: null });
    })
    .catch(error => {
      notification.error("Query could not be archived.");
      return Promise.reject(error);
    });
}

export default function useArchiveQuery(query, onChange) {
  const handleChange = useImmutableCallback(onChange);

  return useCallback(() => {
    confirmArchive()
      .then(() => doArchiveQuery(query))
      .then(handleChange);
  }, [query, handleChange]);
}
