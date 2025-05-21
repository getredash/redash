// cypress/integration/dashboard_viewer_role_spec.js

describe("Dashboard-Only Viewer Role UI and Experience", () => {
  let dashboardViewerUser;
  let sharedDashboard; // { id, slug, name }
  let unsharedDashboard; // { id, slug, name }
  let regularQuery; // { id }
  let regularAlert; // { id }
  let dashboardViewerGroup; // { id }
  let adminUser; // For setting up permissions

  before(() => {
    // 1. Create an admin user (if not already available via cy.loginAs('admin'))
    // This is conceptual; actual user creation/login depends on project setup
    cy.fixture("users/admin").then(admin => {
      adminUser = admin;
    });

    // 2. Create the Dashboard Viewer Group (via API, as admin)
    cy.loginAs(adminUser.email, adminUser.password); // Conceptual login
    cy.request("POST", "/api/groups", { name: "Test Dashboard Viewers" }).then(groupResponse => {
      dashboardViewerGroup = groupResponse.body;
      // Update group permissions to be only 'list_dashboards'
      // This might require another API call if not settable at creation or a new Group type
      // For now, assume Group.DASHBOARD_VIEWER_PERMISSIONS are applied by backend if type is set
      // Or, more explicitly:
      cy.request("POST", `/api/groups/${dashboardViewerGroup.id}`, {
        name: dashboardViewerGroup.name, // name is often required for update
        permissions: ["list_dashboards"], // Explicitly set permissions
        type: "dashboard_viewer" // Assuming type sets specific permissions from backend
      });
    });

    // 3. Create the Dashboard Viewer User and assign to group (via API, as admin)
    cy.fixture("users/dashboard_viewer").then(viewer => {
      cy.request("POST", "/api/users", {
        name: "Dashboard Viewer Test User",
        email: viewer.email,
        password: viewer.password,
        org_id: 1, // Assuming default org or fetched dynamically
      }).then(userResponse => {
        dashboardViewerUser = userResponse.body;
        // Assign user to group (this API might vary)
        cy.request("POST", `/api/groups/${dashboardViewerGroup.id}/members`, { user_id: dashboardViewerUser.id });
        // Ensure user is ONLY in this group - might need to update user's group_ids
        cy.request("POST", `/api/users/${dashboardViewerUser.id}`, { group_ids: [dashboardViewerGroup.id] });
      });
    });
    
    // 4. Create Dashboards and a Query/Alert (as admin)
    cy.request("POST", "/api/dashboards", { name: "Shared Dashboard for Viewer" }).then(dashResponse => {
      sharedDashboard = dashResponse.body;
      // Create a widget on this dashboard for detailed tests
      cy.request("POST", "/api/queries", { data_source_id: 1, name: "Test Query for Widget", query: "SELECT 1"}).then(queryRes => {
        const query = queryRes.body;
        cy.request("POST", "/api/visualizations", { query_id: query.id, type: "TABLE", name: "Test Table Viz"}).then(vizRes => {
          const viz = vizRes.body;
          cy.request("POST", `/api/widgets`, { dashboard_id: sharedDashboard.id, visualization_id: viz.id, options: {}, width: 1});
        });
      });
    });

    cy.request("POST", "/api/dashboards", { name: "Unshared Dashboard" }).then(dashResponse => {
      unsharedDashboard = dashResponse.body;
    });

    cy.request("POST", "/api/queries", { data_source_id: 1, name: "Regular Test Query", query: "SELECT 1" }).then(queryResponse => {
      regularQuery = queryResponse.body;
    });
    cy.request("POST", "/api/alerts", { name: "Regular Test Alert", query_id: regularQuery.id, options: {} }).then(alertResponse => {
      regularAlert = alertResponse.body;
    });

    // 5. Share 'Shared Dashboard for Viewer' with the 'Test Dashboard Viewers' group (as admin)
    // Use the new API: POST /api/dashboards/<dashboard_id>/groups/<group_id>
    cy.request("POST", `/api/dashboards/${sharedDashboard.id}/groups/${dashboardViewerGroup.id}`, {
      access_type: "view", // or the constant ACCESS_TYPE_VIEW if accessible
    });
    
    cy.logout(); // Logout admin
  });

  beforeEach(() => {
    // Log in as the dashboardViewerUser before each test
    if (dashboardViewerUser && dashboardViewerUser.email) {
      cy.loginAs(dashboardViewerUser.email, dashboardViewerUser.password); // Conceptual command
    } else {
      // Skip tests or fail if user setup failed.
      // This often happens if `before` block has async issues not handled by Cypress's command queue.
      // Using `cy.wrap(dashboardViewerUser).its('email').then(...)` in `before` can help chain.
      this.skip(); 
    }
  });

  context("Login and UI Elements Verification", () => {
    it("should not show Queries and Alerts in Navbar", () => {
      cy.visit("/");
      cy.get(".desktop-navbar").should("exist"); // For Desktop
      cy.get(".desktop-navbar").contains("Queries").should("not.exist");
      cy.get(".desktop-navbar").contains("Alerts").should("not.exist");
      cy.get(".desktop-navbar").contains("Dashboards").should("be.visible");

      // Add check for mobile navbar if responsive testing is set up
      // cy.viewport("iphone-6");
      // cy.get(".mobile-navbar-toggle-button").click();
      // cy.get(".mobile-navbar-menu").contains("Queries").should("not.exist");
      // cy.get(".mobile-navbar-menu").contains("Alerts").should("not.exist");
      // cy.get(".mobile-navbar-menu").contains("Dashboards").should("be.visible");
    });

    it("should display a tailored home page for dashboard viewers", () => {
      cy.visit("/");
      // Check for viewer-specific EmptyState text
      cy.contains("View and interact with dashboards shared with you.").should("be.visible");
      cy.contains("Connect to any data source").should("not.exist"); // Original text

      // Check for the list of dashboards
      // ViewerDashboardList component specific checks
      cy.get(".viewer-dashboard-list").should("be.visible");
      cy.get(".viewer-dashboard-list").contains(sharedDashboard.name).should("be.visible");
      cy.get(".viewer-dashboard-list").contains(unsharedDashboard.name).should("not.exist");
      
      // Assert query-related sections are not present
      cy.get("[data-test=HomeExtra]").should("not.exist"); // If HomeExtra had query stuff
      cy.get(".favorites-list").should("not.exist"); // Assuming DashboardAndQueryFavoritesList uses this class
    });

    it("should show 'No dashboards shared' if none are accessible", () => {
      // Temporarily unshare the dashboard for this specific test case
      // This requires logging in as admin again, or a dedicated endpoint for test setup
      cy.loginAs(adminUser.email, adminUser.password);
      cy.request("DELETE", `/api/dashboards/${sharedDashboard.id}/groups/${dashboardViewerGroup.id}`);
      cy.logout();

      cy.loginAs(dashboardViewerUser.email, dashboardViewerUser.password);
      cy.visit("/");
      cy.get(".viewer-dashboard-list").should("be.visible");
      cy.contains("No dashboards have been shared with you yet.").should("be.visible");

      // Re-share for subsequent tests (cleanup or re-setup in afterEach/beforeEach)
      cy.loginAs(adminUser.email, adminUser.password);
      cy.request("POST", `/api/dashboards/${sharedDashboard.id}/groups/${dashboardViewerGroup.id}`, {
        access_type: "view",
      });
      cy.logout();
    });
  });

  context("Dashboard Viewing Experience", () => {
    beforeEach(() => {
      // Ensure user is logged in and dashboard is shared
      cy.loginAs(dashboardViewerUser.email, dashboardViewerUser.password);
      cy.visit(`/dashboards/${sharedDashboard.id}-${sharedDashboard.slug}`);
    });

    it("should not show dashboard-level Edit button", () => {
      // Check for a common Edit button selector on dashboard page
      // This depends on actual implementation, e.g., data-test attribute
      cy.get("[data-test=DashboardEditButton]").should("not.exist"); 
      // Or, if it exists but is disabled (less likely for full hide)
      // cy.get(".dashboard-edit-controls").should("not.be.visible");
      // Also check for 'can_edit: false' in the dashboard API response (done in backend tests, but can be duplicated)
      cy.window().its("Redash. AlgunsPageData.dashboard.can_edit").should("eq", false); // Conceptual access
    });

    it("widget menu should not show View Query or Download options", () => {
      cy.get(".widget-wrapper").first().within(() => {
        // Open widget menu
        cy.get("[data-test=WidgetDropdownButton]").click({ force: true }); // force: true if visibility issues
      });
      
      // Menu items are usually rendered in a portal/overlay, so access globally
      cy.get("[data-test=WidgetDropdownButtonMenu]").should("be.visible");
      cy.get("[data-test=WidgetDropdownButtonMenu]").contains("View Query").should("not.exist");
      cy.get("[data-test=WidgetDropdownButtonMenu]").contains("Download as CSV File").should("not.exist");
      cy.get("[data-test=WidgetDropdownButtonMenu]").contains("Download as Excel File").should("not.exist");
      // Other edit-related options like "Edit Visualization" (if they were there) should also not exist
      // due to canEditDashboard being false.
    });

    it("widget query name in header should not be a link", () => {
      cy.get(".widget-wrapper").first().within(() => {
        // QueryLink component with readOnly=true renders a span instead of <a>
        cy.get(".th-title .query-link").should("exist").and("not.have.attr", "href");
        cy.get(".th-title .query-link span").should("contain", "Test Query for Widget"); // Check name is still visible
      });
    });
  });

  context("Navigation (Negative Tests)", () => {
    it("should redirect or show error when directly navigating to a query URL", () => {
      cy.visit(`/queries/${regularQuery.id}`, { failOnStatusCode: false }); // Allow non-2xx responses
      // Option 1: Redirect to home (or login if session lost, but backend should prevent access)
      // cy.url().should("eq", Cypress.config().baseUrl + "/"); 
      // Option 2: Show a specific "permission denied" or "not found" message from frontend router
      cy.contains("It seems you don't have permission to see this page.").should("be.visible");
      // Or check for a 404/403 status code if the frontend serves these pages with error codes
      // cy.get("[data-test=ErrorPage]").should("contain", "403");
    });

    it("should redirect or show error when directly navigating to an alert URL", () => {
      cy.visit(`/alerts/${regularAlert.id}`, { failOnStatusCode: false });
      cy.contains("It seems you don't have permission to see this page.").should("be.visible");
      // cy.get("[data-test=ErrorPage]").should("contain", "403");
    });
  });
});

// Note: cy.loginAs(), cy.logout() are conceptual custom commands.
// The actual API calls in before() for setup might need to be more robust,
// potentially using cy.wrap().then() to ensure sequential execution if dashboardViewerUser.id
// or group.id are needed immediately for subsequent calls.
// For instance, creating user, then getting its ID to add to a group, then sharing a dashboard with that group.
// The current `before` block might have race conditions if not handled carefully with Cypress's command queue.
// A better approach for complex setup is often to use `cy.task` or a dedicated seeding script/API endpoint.
```
