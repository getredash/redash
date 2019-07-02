/* global cy */

import { createQuery } from '../../support/redash-api';

const SQL = `
  SELECT 'Lorem ipsum dolor'     AS a, 'ipsum'  AS b, 2 AS c UNION ALL
  SELECT 'Lorem sit amet'        AS a, 'amet'   AS b, 2 AS c UNION ALL
  SELECT 'dolor adipiscing elit' AS a, 'elit'   AS b, 4 AS c UNION ALL
  SELECT 'sed do sed'            AS a, 'sed'    AS b, 5 AS c UNION ALL
  SELECT 'sed eiusmod tempor'    AS a, 'tempor' AS b, 7 AS c
`;

describe('Word Cloud', () => {
  beforeEach(() => {
    cy.login();
    createQuery({ query: SQL }).then(({ id }) => {
      cy.visit(`queries/${id}/source`);
      cy.getByTestId('ExecuteButton').click();
    });
  });

  it('creates visualization with automatic word frequencies', () => {
    cy.clickThrough(`
      NewVisualization
      VisualizationType
      VisualizationType.WORD_CLOUD

      WordCloud.WordsColumn
      WordCloud.WordsColumn.a
    `);

    // Wait for proper initialization of visualization
    cy.wait(1000); // eslint-disable-line cypress/no-unnecessary-waiting

    cy.getByTestId('VisualizationPreview').find('svg text').should('have.length', 11);

    cy.percySnapshot('Visualizations - Word Cloud (Automatic word frequencies)', { widths: [1280] });
  });

  it('creates visualization with word frequencies from another column', () => {
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
    cy.wait(1000); // eslint-disable-line cypress/no-unnecessary-waiting

    cy.getByTestId('VisualizationPreview').find('svg text').should('have.length', 5);

    cy.percySnapshot('Visualizations - Word Cloud (Frequencies from another column)');
  });

  it('creates visualization with word length and frequencies limits', () => {
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
      'WordCloud.WordLengthLimit.Min': '4',
      'WordCloud.WordLengthLimit.Max': '5',
      'WordCloud.WordCountLimit.Min': '1',
      'WordCloud.WordCountLimit.Max': '3',
    });

    // Wait for proper initialization of visualization
    cy.wait(1000); // eslint-disable-line cypress/no-unnecessary-waiting

    cy.getByTestId('VisualizationPreview').find('svg text').should('have.length', 2);

    cy.percySnapshot('Visualizations - Word Cloud (With filters)');
  });
});
