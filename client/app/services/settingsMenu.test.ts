import settingsMenu from "./settingsMenu";

const dataSourcesItem = {
  permission: "admin",
  title: "Data Sources",
  path: "data_sources",
};

const usersItem = {
  title: "Users",
  path: "users",
};

settingsMenu.add(null, dataSourcesItem);
settingsMenu.add(null, usersItem);

// @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'describe'. Do you need to instal... Remove this comment to see the full error message
describe("SettingsMenu", () => {
  // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'describe'. Do you need to instal... Remove this comment to see the full error message
  describe("isActive", () => {
    // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'test'. Do you need to install ty... Remove this comment to see the full error message
    test("works with non multi org paths", () => {
      // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
      expect(settingsMenu.getActiveItem("/data_sources/").title).toBe(dataSourcesItem.title);
    });

    // @ts-expect-error ts-migrate(2582) FIXME: Cannot find name 'test'. Do you need to install ty... Remove this comment to see the full error message
    test("works with multi org paths", () => {
      // Set base href:
      const base = document.createElement("base");
      base.setAttribute("href", "http://localhost/acme/");
      document.head.appendChild(base);

      // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
      expect(settingsMenu.getActiveItem("/acme/data_sources/")).toBeTruthy();
      // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'expect'.
      expect(settingsMenu.getActiveItem("/acme/data_sources/").title).toBe(dataSourcesItem.title);
    });
  });
});
