import { test } from "@playwright/test";

/**
 * Bugs the suite knows about. A test for one of them asserts the CORRECT behaviour and calls `knownIssue(id)`
 * first, which marks it as expected to fail. The suite stays green while the bug exists, and the test turns
 * red ("expected to fail, but passed") as soon as it is fixed: remove the entry and the call then.
 *
 * `since` says where the bug comes from: "26.9.0" means it is also in that release; a PR number means it was
 * introduced by that pull request of the frontend dependency upgrade (#7848).
 */
export const KNOWN_ISSUES = {
  "map-popup-close-navigates": { since: "#7857", title: "Closing a map popup with its x navigates to /#close" },
  "pivot-move-duplicates-field": {
    since: "#7862",
    title: "Pivot: moving a field between rows and columns duplicates it",
  },
  "choropleth-kmeans-two-classes": { since: "#7857", title: "Choropleth: k-means clustering yields only two classes" },
  "choropleth-pan-lost-on-resize": { since: "#7862", title: "Choropleth: a dragged view is reset by a window resize" },
  "drag-handle-no-focus-style": { since: "#7860", title: "Parameter drag handle shows no keyboard focus" },
  "parameters-overlap-while-dragging": {
    since: "#7860",
    title: "Parameters overlap or leave the screen during a drag",
  },
  "markdown-table-header-spacing": { since: "#7851", title: "Text box: Markdown table header cells have no spacing" },
  "cancel-before-job-id": {
    since: "26.9.0",
    title: "Cancel before the execute request returns: DELETE /api/jobs/undefined",
  },
  "csp-blocks-ace-worker": {
    since: "26.9.0",
    title: "CSP blocks the editor's syntax worker for YAML/JSON data sources",
  },
  "csv-schema-refresh-fails": { since: "26.9.0", title: "CSV data source: schema refresh fails with a TypeError" },
  "execute-runs-stale-text": { since: "26.9.0", title: "Execute right after typing runs the previous query text" },
  "dropdown-parameter-not-marked-dirty": { since: "26.9.0", title: "A changed dropdown parameter is not highlighted" },
  "date-range-tab-loses-input": { since: "26.9.0", title: "Date range typed with Tab between the fields is lost" },
  "log-axis-min-max": { since: "26.9.0", title: "Chart: logarithmic Y axis with min/max shows NaN ticks" },
  "legend-covers-right-axis": { since: "26.9.0", title: "Chart: right legend covers the right Y axis labels" },
  "heatmap-text-y-empty": { since: "26.9.0", title: "Heatmap with a text Y column is empty with the default Y scale" },
  "heatmap-label-contrast": { since: "26.9.0", title: "Heatmap: dark data labels on the darkest cells" },
  "alert-cancel-keeps-edits": { since: "26.9.0", title: "Alert: Cancel leaves the unsaved values on the page" },
  "query-page-double-history-entry": { since: "26.9.0", title: "Opening a query adds two history entries" },
  "missing-id-returns-500": { since: "26.9.0", title: "Unknown group id / non-numeric query id answer 500" },
  "group-with-empty-name": { since: "26.9.0", title: "A group can be created with an empty name" },
  "non-admin-settings-loads-forever": {
    since: "26.9.0",
    title: "Non-admin on /settings/general sees an endless loading page",
  },
  "tag-after-publish-conflict": {
    since: "26.9.0",
    title: "Dashboard: adding a tag right after Publish fails with 409",
  },
  "legacy-dashboard-url-after-rename": {
    since: "26.9.0",
    title: "Legacy /dashboard/<slug> fails with the slug of a renamed dashboard",
  },
} as const;

export type KnownIssueId = keyof typeof KNOWN_ISSUES;

/** Marks the running test as expected to fail because of a known bug. Call it first thing in the test. */
export function knownIssue(id: KnownIssueId) {
  const issue = KNOWN_ISSUES[id];
  test.info().annotations.push({ type: "known issue", description: `${id} (since ${issue.since}): ${issue.title}` });
  test.fail(true, `Known issue "${id}": ${issue.title}`);
}

/**
 * Problems that only appear with the backend dependency upgrade (#7830) applied. Their tests pass on a
 * backend without it; set E2E_BACKEND_UPGRADE=1 when running against a backend that has it.
 */
export const BACKEND_UPGRADE_ISSUES = {
  "download-file-name-bytes": { since: "#7844", title: "Result downloads are named b'<name>.csv'" },
} as const;

export function backendUpgradeIssue(id: keyof typeof BACKEND_UPGRADE_ISSUES) {
  const issue = BACKEND_UPGRADE_ISSUES[id];
  test
    .info()
    .annotations.push({ type: "backend upgrade issue", description: `${id} (${issue.since}): ${issue.title}` });
  test.fail(!!process.env.E2E_BACKEND_UPGRADE, `Known issue with the backend upgrade "${id}": ${issue.title}`);
}
