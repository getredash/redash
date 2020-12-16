import { isString } from "lodash";
import React, { useState, useEffect } from "react";
import Modal from "antd/lib/modal";
import Input from "antd/lib/input";
import List from "antd/lib/list";
import Link from "@/components/Link";
import CloseOutlinedIcon from "@ant-design/icons/CloseOutlined";
// @ts-expect-error ts-migrate(6133) FIXME: 'DialogPropType' is declared but its value is neve... Remove this comment to see the full error message
import { wrap as wrapDialog, DialogPropType } from "@/components/DialogWrapper";
import { QueryTagsControl } from "@/components/tags-control/TagsControl";
import { Dashboard } from "@/services/dashboard";
import notification from "@/services/notification";
import useSearchResults from "@/lib/hooks/useSearchResults";

import "./add-to-dashboard-dialog.less";

type Props = {
    // @ts-expect-error ts-migrate(2749) FIXME: 'DialogPropType' refers to a value, but is being u... Remove this comment to see the full error message
    dialog: DialogPropType;
    visualization: any;
};

function AddToDashboardDialog({ dialog, visualization }: Props) {
  const [searchTerm, setSearchTerm] = useState("");

  const [doSearch, dashboards, isLoading] = useSearchResults(
    (term: any) => {
      if (isString(term) && term !== "") {
        // @ts-expect-error ts-migrate(2339) FIXME: Property 'query' does not exist on type 'typeof Da... Remove this comment to see the full error message
        return Dashboard.query({ q: term })
          .then((results: any) => results.results)
          .catch(() => []);
      }
      return Promise.resolve([]);
    },
    // @ts-expect-error ts-migrate(2322) FIXME: Type 'never[]' is not assignable to type 'null | u... Remove this comment to see the full error message
    { initialResults: [] }
  );

  const [selectedDashboard, setSelectedDashboard] = useState(null);

  const [saveInProgress, setSaveInProgress] = useState(false);

  useEffect(() => {
    // @ts-expect-error ts-migrate(2349) FIXME: This expression is not callable.
    doSearch(searchTerm);
  }, [doSearch, searchTerm]);

  function addWidgetToDashboard() {
    // Load dashboard with all widgets
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'get' does not exist on type 'typeof Dash... Remove this comment to see the full error message
    Dashboard.get(selectedDashboard)
      .then((dashboard: any) => {
        dashboard.addWidget(visualization);
        return dashboard;
      })
      .then((dashboard: any) => {
        dialog.close();
        const key = `notification-${Math.random()
          .toString(36)
          .substr(2, 10)}`;
        notification.success(
          "Widget added to dashboard",
          // @ts-expect-error ts-migrate(2554) FIXME: Expected 1 arguments, but got 3.
          <React.Fragment>
            <Link href={`${dashboard.url}`} onClick={() => notification.close(key)}>
              {dashboard.name}
            </Link>
            {/* @ts-expect-error ts-migrate(2322) FIXME: Type '{ isDraft: any; tags: any; }' is not assigna... Remove this comment to see the full error message */}
            <QueryTagsControl isDraft={dashboard.is_draft} tags={dashboard.tags} />
          </React.Fragment>,
          { key }
        );
      })
      .catch(() => {
        // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'string' is not assignable to par... Remove this comment to see the full error message
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
            // @ts-expect-error ts-migrate(2322) FIXME: Type 'string | null' is not assignable to type 'st... Remove this comment to see the full error message
            <CloseOutlinedIcon className={searchTerm === "" ? "hidden" : null} onClick={() => setSearchTerm("")} />
          }
        />
      )}

      {/* @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'. */}
      {(items.length > 0 || isLoading) && (
        <List
          className={selectedDashboard ? "add-to-dashboard-dialog-selection" : "add-to-dashboard-dialog-search-results"}
          bordered
          itemLayout="horizontal"
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'boolean | ((searchTerm: any) => void) | null... Remove this comment to see the full error message
          loading={isLoading}
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'boolean | ((searchTerm: any) => void) | null... Remove this comment to see the full error message
          dataSource={items}
          renderItem={d => (
            <List.Item
              // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
              key={`dashboard-${d.id}`}
              actions={selectedDashboard ? [<CloseOutlinedIcon onClick={() => setSelectedDashboard(null)} />] : []}
              // @ts-expect-error ts-migrate(2322) FIXME: Type '(() => void) | null' is not assignable to ty... Remove this comment to see the full error message
              onClick={selectedDashboard ? null : () => setSelectedDashboard(d)}>
              <div className="add-to-dashboard-dialog-item-content">
                {/* @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'. */}
                {d.name}
                {/* @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'. */}
                <QueryTagsControl isDraft={d.is_draft} tags={d.tags} />
              </div>
            </List.Item>
          )}
        />
      )}
    </Modal>
  );
}

export default wrapDialog(AddToDashboardDialog);
