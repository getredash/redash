import React from "react";
import { render } from "@testing-library/react";
import ShareDashboardDialog from "./ShareDashboardDialog";

// jsdom doesn't implement the clipboard command API that InputWithCopy checks for
document.queryCommandSupported = () => true;

function findByTestID(testId) {
  return document.querySelector(`[data-test="${testId}"]`);
}

function renderDialog(canManageSharing, publicAccessEnabled, hasOnlySafeQueries = true) {
  render(
    <ShareDashboardDialog.Component
      dashboard={{
        id: 1,
        publicAccessEnabled,
        public_url: publicAccessEnabled ? "https://redash.example/public/dashboards/token" : undefined,
      }}
      canManageSharing={canManageSharing}
      hasOnlySafeQueries={hasOnlySafeQueries}
      dialog={{ props: { visible: true }, close: () => {}, dismiss: () => {} }}
    />
  );
}

test("viewers can copy an enabled sharing link without changing sharing", () => {
  renderDialog(false, true);
  expect(findByTestID("SecretAddress").value).toBe("https://redash.example/public/dashboards/token");
  expect(findByTestID("PublicAccessEnabled").disabled).toBe(true);
});

test("owners and admins can enable sharing for safe queries", () => {
  renderDialog(true, false);
  expect(findByTestID("PublicAccessEnabled").disabled).toBe(false);
});

test("owners and admins cannot enable sharing for unsafe queries", () => {
  renderDialog(true, false, false);
  expect(findByTestID("PublicAccessEnabled").disabled).toBe(true);
});

test("owners and admins can disable existing sharing even with unsafe queries", () => {
  renderDialog(true, true, false);
  expect(findByTestID("PublicAccessEnabled").disabled).toBe(false);
});
