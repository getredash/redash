describe('Embedded Queries', () => {
  beforeEach(() => {
    cy.login();
    cy.visit('/queries/new');
  });

  it('are shared with text parameters', () => {
    cy.getByTestId('QueryEditor')
      .get('.ace_text-input')
      .type('SELECT * FROM organizations WHERE id=\'{{}{{}id}}\'{esc}', { force: true });

    cy.getByTestId('TextParamInput').type('1');
    cy.getByTestId('ExecuteButton').click();
    cy.getByTestId('SaveButton').click();
    cy.getByTestId('ShowEmbedDialogButton').click({ force: true });
    cy.getByTestId('EmbedIframe').invoke('text').then((iframe) => {
      const embedUrl = iframe.match(/"(.*?)"/)[1];
      cy.logout();
      cy.visit(embedUrl);
    });
  });
});
