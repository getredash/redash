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
    const visualizationName = 'Word Cloud (auto)';

    cy.getByTestId('NewVisualization').click();
    cy.getByTestId('VisualizationType').click();
    cy.getByTestId('VisualizationType.WORD_CLOUD').click();
    cy.getByTestId('VisualizationName').clear().type(visualizationName);

    cy.getByTestId('WordCloud.WordsColumn').click();
    cy.getByTestId('WordCloud.WordsColumn.a').click();

    cy.getByTestId('VisualizationPreview').find('svg text').should('have.length', 11);

    cy.getByTestId('EditVisualizationDialog').contains('button', 'Save').click();
    cy.getByTestId('QueryPageVisualizationTabs').contains('li', visualizationName).should('exist');
  });

  it('creates visualization with word frequencies from another column', () => {
    const visualizationName = 'Word Cloud (frequencies)';

    cy.getByTestId('NewVisualization').click();
    cy.getByTestId('VisualizationType').click();
    cy.getByTestId('VisualizationType.WORD_CLOUD').click();
    cy.getByTestId('VisualizationName').clear().type(visualizationName);

    cy.getByTestId('WordCloud.WordsColumn').click();
    cy.getByTestId('WordCloud.WordsColumn.b').click();

    cy.getByTestId('WordCloud.FrequenciesColumn').click();
    cy.getByTestId('WordCloud.FrequenciesColumn.c').click();

    cy.getByTestId('VisualizationPreview').find('svg text').should('have.length', 5);

    cy.getByTestId('EditVisualizationDialog').contains('button', 'Save').click();
    cy.getByTestId('QueryPageVisualizationTabs').contains('li', visualizationName).should('exist');
  });

  it('creates visualization with word length and frequencies limits', () => {
    const visualizationName = 'Word Cloud (filters)';

    cy.getByTestId('NewVisualization').click();
    cy.getByTestId('VisualizationType').click();
    cy.getByTestId('VisualizationType.WORD_CLOUD').click();
    cy.getByTestId('VisualizationName').clear().type(visualizationName);

    cy.getByTestId('WordCloud.WordsColumn').click();
    cy.getByTestId('WordCloud.WordsColumn.b').click();

    cy.getByTestId('WordCloud.FrequenciesColumn').click();
    cy.getByTestId('WordCloud.FrequenciesColumn.c').click();

    cy.getByTestId('WordCloud.WordLengthLimit.Min').clear().type('4');
    cy.getByTestId('WordCloud.WordLengthLimit.Max').clear().type('5');
    cy.getByTestId('WordCloud.WordCountLimit.Min').clear().type('1');
    cy.getByTestId('WordCloud.WordCountLimit.Max').clear().type('3');

    cy.getByTestId('VisualizationPreview').find('svg text').should('have.length', 2);

    cy.getByTestId('EditVisualizationDialog').contains('button', 'Save').click();
    cy.getByTestId('QueryPageVisualizationTabs').contains('li', visualizationName).should('exist');
  });
});
