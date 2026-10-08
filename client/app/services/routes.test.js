import UniversalRouter from "universal-router";
import routes from "./routes";

// Paths that compete for the same URLs, registered in an order that only works if `routes.items` sorts them
const PATHS = [
  "/queries/:queryId",
  "/queries/:queryId/source",
  "/queries",
  "/queries/new",
  "/queries/favorites",
  "/dashboards/:dashboardId",
  "/dashboards",
  "/dashboards/favorites",
  "/dashboard/:dashboardSlug",
  "/embed/query/:queryId/visualization/:visualizationId",
  "/public/dashboards/:token",
];

describe("routes", () => {
  let router;

  beforeAll(() => {
    PATHS.forEach((path) => {
      routes.register(`Test:${path}`, { path, title: path, action: ({ params }) => ({ path, params }) });
    });
    router = new UniversalRouter(routes.items);
  });

  afterAll(() => {
    PATHS.forEach((path) => {
      routes.unregister(`Test:${path}`);
    });
  });

  test.each([
    ["/queries", "/queries", {}],
    ["/queries/new", "/queries/new", {}],
    ["/queries/favorites", "/queries/favorites", {}],
    ["/queries/12", "/queries/:queryId", { queryId: "12" }],
    ["/queries/12/source", "/queries/:queryId/source", { queryId: "12" }],
    ["/dashboards", "/dashboards", {}],
    ["/dashboards/favorites", "/dashboards/favorites", {}],
    ["/dashboards/7", "/dashboards/:dashboardId", { dashboardId: "7" }],
    ["/dashboards/7-sales-overview", "/dashboards/:dashboardId", { dashboardId: "7-sales-overview" }],
    ["/dashboard/sales-overview", "/dashboard/:dashboardSlug", { dashboardSlug: "sales-overview" }],
    [
      "/embed/query/3/visualization/4",
      "/embed/query/:queryId/visualization/:visualizationId",
      { queryId: "3", visualizationId: "4" },
    ],
    ["/public/dashboards/abc", "/public/dashboards/:token", { token: "abc" }],
  ])("%s resolves to %s", async (pathname, path, params) => {
    await expect(router.resolve({ pathname })).resolves.toEqual({ path, params });
  });

  test("static paths come before parameterized ones", () => {
    const paths = routes.items.map((item) => item.path).filter((path) => PATHS.includes(path));
    expect(paths.indexOf("/queries/new")).toBeLessThan(paths.indexOf("/queries/:queryId"));
    expect(paths.indexOf("/dashboards/favorites")).toBeLessThan(paths.indexOf("/dashboards/:dashboardId"));
  });

  test("an unknown path is rejected", async () => {
    await expect(router.resolve({ pathname: "/nothing/here/at/all" })).rejects.toThrow();
  });
});
