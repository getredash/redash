describe("Create Custom Map", () => {
  beforeEach(() => {
    cy.login();
  });

  it("creates a custom map via the settings page", () => {
    // Clean up any existing test map
    cy.request("GET", "api/custom_maps")
      .then(({ body }) => body.filter((m) => m.name === "Test Counties"))
      .each((m) => cy.request("DELETE", `api/custom_maps/${m.id}`));

    // Intercept the create call
    cy.intercept("POST", "api/custom_maps", (req) => {
      req.reply({
        statusCode: 200,
        body: {
          id: 999,
          name: req.body.name,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user: { id: 1, name: "Admin" },
        },
      });
    }).as("createMap");

    cy.visit("/custom_maps/new");

    cy.getByTestId("CustomMapDialog").within(() => {
      cy.getByTestId("CustomMapName").type("Test Counties");
    });

    // Attach a minimal GeoJSON file
    const geojson = JSON.stringify({ type: "FeatureCollection", features: [] });
    const blob = new Blob([geojson], { type: "application/json" });
    const file = new File([blob], "test.geojson", { type: "application/json" });

    cy.getByTestId("CustomMapFileUpload").click();
    cy.get("input[type=file]").selectFile(
      { contents: Cypress.Buffer.from(geojson), fileName: "test.geojson", mimeType: "application/json" },
      { force: true }
    );

    cy.getByTestId("SaveCustomMapButton").click();
    cy.wait("@createMap");

    // Verify dialog closes (back to list)
    cy.url().should("include", "/custom_maps");
  });
});
