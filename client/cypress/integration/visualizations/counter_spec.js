/* global cy */

const SQL = `
  SELECT 27182.8182846 AS a, 20000 AS b, 'lorem' AS c UNION ALL
  SELECT 31415.9265359 AS a, 40000 AS b, 'ipsum' AS c
`;

describe("Counter", () => {
  beforeEach(() => {
    cy.login();
    cy.createQuery({ query: SQL }).then(({ id }) => {
      cy.visit(`queries/${id}/source`);
      cy.wait(1500); // eslint-disable-line cypress/no-unnecessary-waiting
      cy.getByTestId("ExecuteButton").click();
    });
    cy.getByTestId("NewVisualization").click();
    cy.getByTestId("VisualizationType").selectAntdOption("VisualizationType.COUNTER");
  });

  it("creates simple Counter", () => {
    cy.clickThrough(`
      Counter.General.ValueColumn
      Counter.General.ValueColumn.a
    `);

    cy.getByTestId("VisualizationPreview").find(".counter-visualization-container").should("exist");

    // wait a bit before taking snapshot
    cy.wait(500); // eslint-disable-line cypress/no-unnecessary-waiting
  });

  it("creates Counter with custom label", () => {
    cy.clickThrough(`
      Counter.General.ValueColumn
      Counter.General.ValueColumn.a
    `);

    cy.fillInputs({
      "Counter.General.Label": "Custom Label",
    });

    cy.getByTestId("VisualizationPreview").find(".counter-visualization-container").should("exist");

    // wait a bit before taking snapshot
    cy.wait(500); // eslint-disable-line cypress/no-unnecessary-waiting
  });

  it("creates Counter with non-numeric value", () => {
    cy.clickThrough(`
      Counter.General.ValueColumn
      Counter.General.ValueColumn.c

      Counter.General.TargetValueColumn
      Counter.General.TargetValueColumn.c
    `);

    cy.fillInputs({
      "Counter.General.TargetValueRowNumber": "2",
    });

    cy.getByTestId("VisualizationPreview").find(".counter-visualization-container").should("exist");

    // wait a bit before taking snapshot
    cy.wait(500); // eslint-disable-line cypress/no-unnecessary-waiting
  });

  it("creates Counter with target value (trend positive)", () => {
    cy.clickThrough(`
      Counter.General.ValueColumn
      Counter.General.ValueColumn.a

      Counter.General.TargetValueColumn
      Counter.General.TargetValueColumn.b
    `);

    cy.getByTestId("VisualizationPreview").find(".counter-visualization-container").should("exist");

    // wait a bit before taking snapshot
    cy.wait(500); // eslint-disable-line cypress/no-unnecessary-waiting
  });

  it("creates Counter with custom row number (trend negative)", () => {
    cy.clickThrough(`
      Counter.General.ValueColumn
      Counter.General.ValueColumn.a

      Counter.General.TargetValueColumn
      Counter.General.TargetValueColumn.b
    `);

    cy.fillInputs({
      "Counter.General.ValueRowNumber": "2",
      "Counter.General.TargetValueRowNumber": "2",
    });

    cy.getByTestId("VisualizationPreview").find(".counter-visualization-container").should("exist");

    // wait a bit before taking snapshot
    cy.wait(500); // eslint-disable-line cypress/no-unnecessary-waiting
  });

  it("creates Counter with count rows", () => {
    cy.clickThrough(`
      Counter.General.ValueColumn
      Counter.General.ValueColumn.a

      Counter.General.CountRows
    `);

    cy.getByTestId("VisualizationPreview").find(".counter-visualization-container").should("exist");

    // wait a bit before taking snapshot
    cy.wait(500); // eslint-disable-line cypress/no-unnecessary-waiting
  });

  it("creates Counter with formatting", () => {
    cy.clickThrough(`
      Counter.General.ValueColumn
      Counter.General.ValueColumn.a

      Counter.General.TargetValueColumn
      Counter.General.TargetValueColumn.b

      VisualizationEditor.Tabs.Format
    `);

    cy.fillInputs({
      "Counter.Formatting.DecimalPlace": "4",
      "Counter.Formatting.DecimalCharacter": ",",
      "Counter.Formatting.ThousandsSeparator": "`",
      "Counter.Formatting.StringPrefix": "$",
      "Counter.Formatting.StringSuffix": "%",
    });

    cy.getByTestId("VisualizationPreview").find(".counter-visualization-container").should("exist");

    // wait a bit before taking snapshot
    cy.wait(500); // eslint-disable-line cypress/no-unnecessary-waiting
  });

  it("creates Counter with target value formatting", () => {
    cy.clickThrough(`
      Counter.General.ValueColumn
      Counter.General.ValueColumn.a

      Counter.General.TargetValueColumn
      Counter.General.TargetValueColumn.b

      VisualizationEditor.Tabs.Format
      Counter.Formatting.FormatTargetValue
    `);

    cy.fillInputs({
      "Counter.Formatting.DecimalPlace": "4",
      "Counter.Formatting.DecimalCharacter": ",",
      "Counter.Formatting.ThousandsSeparator": "`",
      "Counter.Formatting.StringPrefix": "$",
      "Counter.Formatting.StringSuffix": "%",
    });

    cy.getByTestId("VisualizationPreview").find(".counter-visualization-container").should("exist");

    // wait a bit before taking snapshot
    cy.wait(500); // eslint-disable-line cypress/no-unnecessary-waiting
  });
});
