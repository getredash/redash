describe("View Only Group Management", () => {
  beforeEach(() => {
    cy.login(); // Login as admin
  });

  it("should show view-only checkbox when creating a group", () => {
    cy.visit("/groups/new");
    
    // Check that the view-only checkbox exists
    cy.get('[data-test="GroupViewOnly"]').should("exist");
    cy.get('label:contains("View Only Group")').should("exist");
  });

  it("should create a view-only group", () => {
    // Navigate to groups page
    cy.visit("/groups");

    // Click create group button
    cy.getByTestId("CreateGroupButton").click();

    // Fill in group details
    cy.getByTestId("Group.name").type("Test View Only Group");
    
    // Check the view-only checkbox
    cy.getByTestId("Group.isViewOnly").check();

    // Save the group
    cy.getByTestId("SaveGroupButton").click();

    // Verify the group was created with view-only badge
    cy.contains("Test View Only Group").should("exist");
    cy.contains("Test View Only Group")
      .parent()
      .within(() => {
        cy.contains("View Only").should("exist");
      });
  });

  it("should convert existing group to view-only", () => {
    // First create a regular group
    cy.request({
      method: "POST",
      url: "/api/groups",
      body: {
        name: "Regular Group to Convert",
        is_view_only: false,
      },
      failOnStatusCode: false,
    }).then(() => {
      // Navigate to groups page
      cy.visit("/groups");

      // Click on the group to edit
      cy.contains("Regular Group to Convert").click();

      // Check the view-only checkbox
      cy.getByTestId("Group.isViewOnly").check();

      // Save changes
      cy.getByTestId("SaveGroupButton").click();

      // Go back to groups list
      cy.visit("/groups");

      // Verify the group now shows view-only badge
      cy.contains("Regular Group to Convert")
        .parent()
        .within(() => {
          cy.contains("View Only").should("exist");
        });
    });
  });

  it("should show view-only badge in group details", () => {
    // Create a view-only group via API
    cy.request({
      method: "POST",
      url: "/api/groups",
      body: {
        name: "View Only Details Test",
        is_view_only: true,
      },
      failOnStatusCode: false,
    }).then((response) => {
      let groupId;
      if (response.status === 200 || response.status === 201) {
        groupId = response.body.id;
      } else {
        // Group might already exist, find it
        cy.request("GET", "/api/groups").then((resp) => {
          const group = resp.body.find((g) => g.name === "View Only Details Test");
          if (group) {
            groupId = group.id;
          }
        });
      }

      if (groupId) {
        // Visit the group details page
        cy.visit(`/groups/${groupId}`);

        // Verify view-only badge is shown
        cy.contains("View Only").should("exist");

        // Verify checkbox is checked
        cy.getByTestId("Group.isViewOnly").should("be.checked");
      }
    });
  });
}); 