import React, { useEffect, useState } from "react";
import moment from "moment";

import Button from "antd/lib/button";
import Modal from "antd/lib/modal";
import Tag from "antd/lib/tag";

import Link from "@/components/Link";
import PageHeader from "@/components/PageHeader";
import Paginator from "@/components/Paginator";
import { wrap as itemsList, ControllerType } from "@/components/items-list/ItemsList";
import { ResourceItemsSource } from "@/components/items-list/classes/ItemsSource";
import { UrlStateStorage } from "@/components/items-list/classes/StateStorage";
import ItemsTable, { Columns } from "@/components/items-list/components/ItemsTable";

import ComposedDashboardService from "../../services/composedDashboard";
import DeploymentResultsTable from "./DeploymentResultsTable";

function organizationsSummary(run) {
  const withErrors = run.results.filter((result) => result.errors.length > 0).length;
  return withErrors > 0 ? `${run.results.length} targeted, ${withErrors} with errors` : `${run.results.length} targeted`;
}

function deployedAt(run) {
  // Columns.dateTime formats with clientConfig.dateTimeFormat, and the global SPA never loads
  // a client config, so spell the format out here.
  return moment(run.created_at).format("YYYY-MM-DD HH:mm:ss");
}

function listColumns(onShowResults) {
  return [
    Columns.custom((text, run) => deployedAt(run), { title: "Deployed at", width: "1%", className: "text-nowrap" }),
    Columns.custom(
      (text, run) => (run.succeeded ? <Tag color="green">Deployed</Tag> : <Tag color="red">Nothing deployed</Tag>),
      { title: "Outcome", width: "1%", className: "text-nowrap" }
    ),
    Columns.custom((text, run) => organizationsSummary(run), {
      title: "Organizations",
      width: "1%",
      className: "text-nowrap",
    }),
    Columns.custom((text, run) => run.deployed_by, { title: "Deployed by", width: "1%", className: "text-nowrap" }),
    Columns.custom((text, run) => run.comment || "—", { title: "Comment", width: null }),
    Columns.custom(
      (text, run) => (
        <Button size="small" onClick={() => onShowResults(run)}>
          View results
        </Button>
      ),
      { title: "", width: "1%", className: "text-nowrap" }
    ),
  ];
}

function ComposedDashboardDeployments({ controller }) {
  const { composedDashboardId } = controller.params;
  const [composedDashboard, setComposedDashboard] = useState(null);
  // Errors are too long to fit a table cell, so a run's per-org rows open in a modal the
  // admin dismisses, the same way the Deploy button reports the run it just made.
  const [shownRun, setShownRun] = useState(null);

  useEffect(() => {
    let isCancelled = false;

    ComposedDashboardService.get(composedDashboardId).then((dashboard) => {
      if (!isCancelled) {
        setComposedDashboard(dashboard);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [composedDashboardId]);

  const title = composedDashboard ? `Deployment history — ${composedDashboard.name}` : "Deployment history";

  return (
    <div className="page-dashboard-list">
      <div className="container">
        <PageHeader title={title} />
        <div className="m-b-15">
          <Link href="composed-dashboards">&larr; Back to composed dashboards</Link>
        </div>
        {controller.isLoaded && controller.isEmpty ? (
          <div className="text-center">This composed dashboard has never been deployed.</div>
        ) : (
          <div className="bg-white tiled table-responsive">
            <ItemsTable
              items={controller.pageItems}
              loading={!controller.isLoaded}
              columns={listColumns(setShownRun)}
            />
            <Paginator
              showPageSizeSelect
              totalCount={controller.totalItemsCount}
              pageSize={controller.itemsPerPage}
              onPageSizeChange={(itemsPerPage) => controller.updatePagination({ itemsPerPage })}
              page={controller.page}
              onChange={(page) => controller.updatePagination({ page })}
            />
          </div>
        )}
        <Modal
          visible={shownRun !== null}
          title={shownRun ? `Deployment on ${deployedAt(shownRun)}` : ""}
          width={720}
          onCancel={() => setShownRun(null)}
          footer={<Button onClick={() => setShownRun(null)}>Close</Button>}>
          {shownRun && (
            <React.Fragment>
              {shownRun.succeeded ? (
                <p>Deployed to {shownRun.results.length} organization(s).</p>
              ) : (
                <p>
                  <strong>Nothing was deployed.</strong> A deployment is all or nothing, so the organizations below
                  that reported no problem were rolled back too.
                </p>
              )}
              <DeploymentResultsTable results={shownRun.results} />
            </React.Fragment>
          )}
        </Modal>
      </div>
    </div>
  );
}

ComposedDashboardDeployments.propTypes = {
  controller: ControllerType.isRequired,
};

const ComposedDashboardDeploymentsPage = itemsList(
  ComposedDashboardDeployments,
  () =>
    new ResourceItemsSource({
      getResource({ params: { composedDashboardId } }) {
        return (request) => ComposedDashboardService.deploymentRuns(composedDashboardId, request);
      },
    }),
  () => new UrlStateStorage({ orderByField: "created_at", orderByReverse: true })
);

export default ComposedDashboardDeploymentsPage;
