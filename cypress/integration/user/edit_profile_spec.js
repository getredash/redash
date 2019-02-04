describe('Edit Profile', () => {
  beforeEach(() => {
    cy.login();
    cy.visit('/users/me');
  });

  it('regenerates API Key', () => {
    cy.getByTestId('ApiKey').then(($apiKey) => {
      const previousApiKey = $apiKey.val();

      cy.getByTestId('RegenerateApiKey').click();
      cy.get('.ant-btn-primary').contains('Regenerate').click({ force: true });
  
      cy.getByTestId('ApiKey').should('not.eq', previousApiKey);
    });
  });
});
