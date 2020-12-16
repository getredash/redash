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

describe("SettingsMenu", () => {
  describe("isActive", () => {
    test("works with non multi org paths", () => {
      // @ts-expect-error ts-migrate(2532) FIXME: Object is possibly 'undefined'.
      expect(settingsMenu.getActiveItem("/data_sources/").title).toBe(dataSourcesItem.title);
    });

    test("works with multi org paths", () => {
      // Set base href:
      const base = document.createElement("base");
      base.setAttribute("href", "http://localhost/acme/");
      document.head.appendChild(base);

      expect(settingsMenu.getActiveItem("/acme/data_sources/")).toBeTruthy();
      // @ts-expect-error ts-migrate(2532) FIXME: Object is possibly 'undefined'.
      expect(settingsMenu.getActiveItem("/acme/data_sources/").title).toBe(dataSourcesItem.title);
    });
  });
});
