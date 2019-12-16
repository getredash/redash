import { clone, extend } from "lodash";
import React from "react";
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
  // Prettier will put `.$promise` before `.catch` on next line :facepalm:
  // prettier-ignore
  return Query.delete({ id: query.id }).$promise
    .then(() => Promise.resolve(extend(clone(query), { is_archived: true, schedule: null })))
    .catch(error => {
      notification.error("Query could not be archived.");
      return Promise.reject(error);
    });
}

export default function archiveQuery(query) {
  return confirmArchive().then(() => doArchiveQuery(query));
}
