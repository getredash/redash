/* global cy, Cypress */

import { createQuery } from "../../support/redash-api";

const { map } = Cypress._;

const SQL = `
  SELECT 'Lorem ipsum dolor'     AS a, 'ipsum'  AS b, 2 AS c UNION ALL
  SELECT 'Lorem sit amet'        AS a, 'amet'   AS b, 2 AS c UNION ALL
  SELECT 'dolor adipiscing elit' AS a, 'elit'   AS b, 4 AS c UNION ALL
  SELECT 'sed do sed'            AS a, 'sed'    AS b, 5 AS c UNION ALL
  SELECT 'sed eiusmod tempor'    AS a, 'tempor' AS b, 7 AS c
`;

// Hack to fix Cypress -> Percy communication
// Word Cloud uses `font-family` defined in CSS with a lot of fallbacks, so
// it's almost impossible to know which font will be used on particular machine/browser.
// In Cypress browser it could be one font, in Percy - another.
// The issue is in how Percy takes screenshots: it takes a DOM/CSS/assets snapshot in Cypress,
// copies it to own servers and restores in own browsers. Word Cloud computes its layout
// using Cypress font, sets absolute positions for elements (in pixels), and when it is restored
// on Percy machines (with another font) - visualization gets messed up.
// Solution: explicitly provide some font that will be 100% the same on all CI machines. In this
// case, it's "Roboto" just because it's in the list of fallback fonts and we already have this
// webfont in assets folder (so browser can load it).
function injectFont(document) {
  const style = document.createElement("style");
  style.setAttribute("id", "percy-fix");
  style.setAttribute("type", "text/css");

  const fonts = [
    ["Roboto", "Roboto-Light-webfont", 300],
    ["Roboto", "Roboto-Regular-webfont", 400],
    ["Roboto", "Roboto-Medium-webfont", 500],
    ["Roboto", "Roboto-Bold-webfont", 700],
  ];

  const basePath = "/static/fonts/roboto/";

  // `insertRule` does not load font for some reason. Using text content works ¯\_(ツ)_/¯
  style.appendChild(
    document.createTextNode(
      map(
        fonts,
        ([fontFamily, fileName, fontWeight]) => `
    @font-face {
      font-family: "${fontFamily}";
      font-weight: ${fontWeight};
      src: url("${basePath}${fileName}.eot");
      src: url("${basePath}${fileName}.eot?#iefix") format("embedded-opentype"),
           url("${basePath}${fileName}.woff") format("woff"),
           url("${basePath}${fileName}.ttf") format("truetype"),
           url("${basePath}${fileName}.svg") format("svg");
    }
  `
      ).join("\n\n")
    )
  );
  document.getElementsByTagName("head")[0].appendChild(style);
}

describe("Word Cloud", () => {
  const viewportWidth = Cypress.config("viewportWidth");

  beforeEach(() => {
    cy.login();
    createQuery({ query: SQL }).then(({ id }) => {
      cy.visit(`queries/${id}/source`);
      cy.getByTestId("ExecuteButton").click();
    });
    cy.document().then(injectFont);
  });

  it("creates visualization with automatic word frequencies", () => {
    cy.clickThrough(`
      NewVisualization
      VisualizationType
      VisualizationType.WORD_CLOUD

      WordCloud.WordsColumn
      WordCloud.WordsColumn.a
    `);

    // Wait for proper initialization of visualization
    cy.wait(500); // eslint-disable-line cypress/no-unnecessary-waiting

    cy.getByTestId("VisualizationPreview")
      .find("svg text")
      .should("have.length", 11);

    cy.percySnapshot("Visualizations - Word Cloud (Automatic word frequencies)", { widths: [viewportWidth] });
  });

  it("creates visualization with word frequencies from another column", () => {
    cy.clickThrough(`
      NewVisualization
      VisualizationType
      VisualizationType.WORD_CLOUD

      WordCloud.WordsColumn
      WordCloud.WordsColumn.b

      WordCloud.FrequenciesColumn
      WordCloud.FrequenciesColumn.c
    `);

    // Wait for proper initialization of visualization
    cy.wait(500); // eslint-disable-line cypress/no-unnecessary-waiting

    cy.getByTestId("VisualizationPreview")
      .find("svg text")
      .should("have.length", 5);

    cy.percySnapshot("Visualizations - Word Cloud (Frequencies from another column)", { widths: [viewportWidth] });
  });

  it("creates visualization with word length and frequencies limits", () => {
    cy.clickThrough(`
      NewVisualization
      VisualizationType
      VisualizationType.WORD_CLOUD

      WordCloud.WordsColumn
      WordCloud.WordsColumn.b

      WordCloud.FrequenciesColumn
      WordCloud.FrequenciesColumn.c
    `);

    cy.fillInputs({
      "WordCloud.WordLengthLimit.Min": "4",
      "WordCloud.WordLengthLimit.Max": "5",
      "WordCloud.WordCountLimit.Min": "1",
      "WordCloud.WordCountLimit.Max": "3",
    });

    // Wait for proper initialization of visualization
    cy.wait(500); // eslint-disable-line cypress/no-unnecessary-waiting

    cy.getByTestId("VisualizationPreview")
      .find("svg text")
      .should("have.length", 2);

    cy.percySnapshot("Visualizations - Word Cloud (With filters)", { widths: [viewportWidth] });
  });
});
