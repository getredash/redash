import { isObject, clone, extend, keys, map, omit, pick } from "lodash";
import React from "react";
import Modal from "antd/lib/modal";
import { Query } from "@/services/query";
import notification from "@/services/notification";

class SaveQueryError extends Error {
  constructor(message, detailedMessage = null) {
    super(message);
    this.detailedMessage = detailedMessage;
  }
}

class SaveQueryConflictError extends SaveQueryError {
  constructor() {
    super(
      "Changes not saved",
      <React.Fragment>
        <div className="m-b-5">It seems like the query has been modified by another user.</div>
        <div>Please copy/backup your changes and reload this page.</div>
      </React.Fragment>
    );
  }
}

function confirmOverwrite() {
  return new Promise((resolve, reject) => {
    Modal.confirm({
      title: "Overwrite Query",
      content: (
        <React.Fragment>
          <div className="m-b-5">It seems like the query has been modified by another user.</div>
          <div>Are you sure you want to overwrite the query with your version?</div>
        </React.Fragment>
      ),
      okText: "Overwrite",
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

function doSaveQuery(data, { canOverwrite = false } = {}) {
  // omit parameter properties that don't need to be stored
  if (isObject(data.options) && data.options.parameters) {
    data.options = {
      ...data.options,
      parameters: map(data.options.parameters, p => p.toSaveableObject()),
    };
  }

  // Prettier will put `.$promise` before `.catch` on next line :facepalm:
  // prettier-ignore
  return Query.save(data).$promise
    .catch(error => {
      if (error.status === 409) {
        if (canOverwrite) {
          return confirmOverwrite()
            .then(() => Query.save(omit(data, ["version"])).$promise)
            .catch(() => Promise.reject(new SaveQueryConflictError()));
        }
        return Promise.reject(new SaveQueryConflictError());
      }
      return Promise.reject(new SaveQueryError("Query could not be saved"));
    });
}

export default function saveQuery(query, data, { successMessage = "Query saved" } = {}) {
  if (isObject(data)) {
    // Don't save new query with partial data
    if (query.isNew()) {
      return Promise.resolve(extend(clone(query), data));
    }
    data = { ...data, id: query.id, version: query.version };
  } else {
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
    ]);
  }

  return doSaveQuery(data, { canOverwrite: query.can_edit })
    .then(updatedQuery => {
      notification.success(successMessage);
      return extend(clone(query), pick(updatedQuery, keys(data)));
    })
    .catch(error => {
      const notificationOptions = {};
      if (error instanceof SaveQueryConflictError) {
        notificationOptions.duration = null;
      }
      notification.error(error.message, error.detailedMessage, notificationOptions);
      return Promise.reject(error);
    });
}
