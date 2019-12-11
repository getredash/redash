import { isString } from "lodash";
import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import Modal from "antd/lib/modal";
import Input from "antd/lib/input";
import List from "antd/lib/list";
import Icon from "antd/lib/icon";
import { wrap as wrapDialog, DialogPropType } from "@/components/DialogWrapper";
import { QueryTagsControl } from "@/components/tags-control/TagsControl";
import { Dashboard } from "@/services/dashboard";
import notification from "@/services/notification";
import useSearchResults from "@/lib/hooks/useSearchResults";

import "./add-to-dashboard-dialog.less";

function AddToDashboardDialog({ dialog, visualization }) {
  const [searchTerm, setSearchTerm] = useState("");

  const [doSearch, dashboards, isLoading] = useSearchResults(
    term => {
      if (isString(term) && term !== "") {
        return Dashboard.get({ q: term }).$promise.then(results => results.results);
      }
      return Promise.resolve([]);
    },
    { initialResults: [] }
  );

  const [selectedDashboard, setSelectedDashboard] = useState(null);

  const [saveInProgress, setSaveInProgress] = useState(false);

  useEffect(() => {
    doSearch(searchTerm);
  }, [doSearch, searchTerm]);

  function addWidgetToDashboard() {
    // Load dashboard with all widgets
    Dashboard.get({ slug: selectedDashboard.slug })
      .$promise.then(dashboard => {
        dashboard.addWidget(visualization);
        return dashboard;
      })
      .then(dashboard => {
        dialog.close();
        const key = `notification-${Math.random()
          .toString(36)
          .substr(2, 10)}`;
        notification.success(
          "Widget added to dashboard",
          <React.Fragment>
            <a href={`dashboard/${dashboard.slug}`} onClick={() => notification.close(key)}>
              {dashboard.name}
            </a>
            <QueryTagsControl isDraft={dashboard.is_draft} tags={dashboard.tags} />
          </React.Fragment>,
          { key }
        );
      })
      .catch(() => {
        notification.error("Widget not added.");
      })
      .finally(() => {
        setSaveInProgress(false);
      });
  }

  const items = selectedDashboard ? [selectedDashboard] : dashboards;

  return (
    <Modal
      {...dialog.props}
      title="Add to Dashboard"
      okButtonProps={{ disabled: !selectedDashboard || saveInProgress, loading: saveInProgress }}
      cancelButtonProps={{ disabled: saveInProgress }}
      onOk={addWidgetToDashboard}>
      <label htmlFor="add-to-dashboard-dialog-dashboard">Choose the dashboard to add this query to:</label>

      {!selectedDashboard && (
        <Input
          id="add-to-dashboard-dialog-dashboard"
          className="w-100"
          autoComplete="off"
          autoFocus
          placeholder="Search a dashboard by name"
          value={searchTerm}
          onChange={event => setSearchTerm(event.target.value)}
          suffix={
            <Icon type="close" className={searchTerm === "" ? "hidden" : null} onClick={() => setSearchTerm("")} />
          }
        />
      )}

      {(items.length > 0 || isLoading) && (
        <List
          className={selectedDashboard ? "add-to-dashboard-dialog-selection" : "add-to-dashboard-dialog-search-results"}
          bordered
          itemLayout="horizontal"
          loading={isLoading}
          dataSource={items}
          renderItem={d => (
            <List.Item
              key={`dashboard-${d.id}`}
              actions={selectedDashboard ? [<Icon type="close" onClick={() => setSelectedDashboard(null)} />] : []}
              onClick={selectedDashboard ? null : () => setSelectedDashboard(d)}>
              <div className="add-to-dashboard-dialog-item-content">
                {d.name}
                <QueryTagsControl isDraft={d.is_draft} tags={d.tags} />
              </div>
            </List.Item>
          )}
        />
      )}
    </Modal>
  );
}

AddToDashboardDialog.propTypes = {
  dialog: DialogPropType.isRequired,
  visualization: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
};

export default wrapDialog(AddToDashboardDialog);
