import React from "react";
import { shallow } from "enzyme";
import ShareDashboardDialog from "./ShareDashboardDialog";

function renderDialog(canManageSharing, publicAccessEnabled, hasOnlySafeQueries = true) {
  return shallow(
    <ShareDashboardDialog.Component
      dashboard={{
        id: 1,
        publicAccessEnabled,
        public_url: publicAccessEnabled ? "https://redash.example/public/dashboards/token" : undefined,
      }}
      canManageSharing={canManageSharing}
      hasOnlySafeQueries={hasOnlySafeQueries}
      dialog={{ props: {}, close: () => {}, dismiss: () => {} }}
    />
  );
}

test("viewers can copy an enabled sharing link without changing sharing", () => {
  const wrapper = renderDialog(false, true);
  expect(wrapper.find('[data-test="SecretAddress"]').prop("value")).toBe(
    "https://redash.example/public/dashboards/token"
  );
  expect(wrapper.find('[data-test="PublicAccessEnabled"]').prop("disabled")).toBe(true);
});

test("owners and admins can enable sharing for safe queries", () => {
  const wrapper = renderDialog(true, false);
  expect(wrapper.find('[data-test="PublicAccessEnabled"]').prop("disabled")).toBe(false);
});

test("owners and admins cannot enable sharing for unsafe queries", () => {
  const wrapper = renderDialog(true, false, false);
  expect(wrapper.find('[data-test="PublicAccessEnabled"]').prop("disabled")).toBe(true);
});

test("owners and admins can disable existing sharing even with unsafe queries", () => {
  const wrapper = renderDialog(true, true, false);
  expect(wrapper.find('[data-test="PublicAccessEnabled"]').prop("disabled")).toBe(false);
});
