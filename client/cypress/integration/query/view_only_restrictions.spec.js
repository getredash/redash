describe("View Only Restrictions", () => {
  beforeEach(() => {
    cy.login();
    // Ensure we're logged in by visiting the home page
    cy.visit("/");
    cy.wait(1000); // Wait for session to be established
  });

  it("should not show SQL code for view-only users", () => {
    // Create a test query first
    cy.createQuery({
      name: "Test Query for View Only",
      query: "SELECT * FROM users WHERE id = 1",
    }).then((query) => {
      // Create a view-only group
      cy.request({
        method: "POST",
        url: "/api/groups",
        body: {
          name: "View Only Test Group",
          is_view_only: true,
        },
        failOnStatusCode: false,
      }).then((groupResponse) => {
        let groupId;
        if (groupResponse.status === 200 || groupResponse.status === 201) {
          groupId = groupResponse.body.id;
        } else {
          // Group might already exist, try to find it
          cy.request("GET", "/api/groups").then((response) => {
            const group = response.body.find((g) => g.name === "View Only Test Group");
            if (group) {
              groupId = group.id;
            }
          });
        }

        // Create a test user
        cy.createUser({
          name: "View Only Test User",
          email: "viewonly.test@example.com",
          password: "testpass123",
        }).then(() => {
          // Add user to view-only group
          cy.request({
            method: "POST",
            url: `/api/groups/${groupId}/members`,
            body: {
              user_id: "viewonly.test@example.com", // API accepts email
            },
            failOnStatusCode: false,
          });

          // Logout and login as view-only user
          cy.logout();
          cy.login("viewonly.test@example.com", "testpass123");
          cy.visit("/"); // Ensure we're on the home page
          cy.wait(1000); // Wait for session

          // Visit the query page
          cy.visit(`/queries/${query.id}`);

          // SQL editor should not be visible
          cy.get(".query-editor").should("not.exist");
          cy.get(".ace_editor").should("not.exist");

          // Query results should still be visible
          cy.getByTestId("QueryExecutionStatus").should("be.visible");
        });
      });
    });
  });

  it("should not show download buttons for view-only users", () => {
    // Create a test query
    cy.createQuery({
      name: "Test Query for Download Restriction",
      query: "SELECT 1 as test",
    }).then((query) => {
      // Login as view-only user (assuming they exist from previous test)
      cy.logout();
      cy.login("viewonly.test@example.com", "testpass123");

      // Visit the query page
      cy.visit(`/queries/${query.id}`);

      // Execute the query to get results
      cy.getByTestId("ExecuteButton").click();
      cy.wait(1000); // Wait for query to execute

      // Download buttons should not be visible
      cy.get('[data-test="QueryControlDropdownButton"]').click();
      cy.get('[data-test="DownloadQueryResultsMenu"]').should("not.exist");
      cy.get('[data-test="DownloadVisualizationMenu"]').should("not.exist");
    });
  });

  it("should allow view-only users to execute queries", () => {
    // Create a test query
    cy.createQuery({
      name: "Test Query for Execution",
      query: "SELECT 2 as test",
    }).then((query) => {
      // Login as view-only user
      cy.logout();
      cy.login("viewonly.test@example.com", "testpass123");

      // Visit the query page
      cy.visit(`/queries/${query.id}`);

      // Execute button should be visible and clickable
      cy.getByTestId("ExecuteButton").should("be.visible").click();

      // Query should execute successfully
      cy.getByTestId("QueryExecutionStatus").should("contain", "Done");
    });
  });
}); 