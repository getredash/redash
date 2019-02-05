function fillProfileDataAndSave(name, email) {
  cy.getByTestId('Name').type(`{selectall}${name}`);
  cy.getByTestId('Email').type(`{selectall}${email}{enter}`);
  cy.contains('Saved.');
}

function fillChangePasswordAndSave(currentPassword, newPassword, repeatPassword) {
  cy.getByTestId('Current Password').type(currentPassword);
  cy.getByTestId('New Password').type(newPassword);
  cy.getByTestId('Repeat New Password').type(`${repeatPassword}{enter}`);
}

describe('Edit Profile', () => {
  beforeEach(() => {
    cy.login();
    cy.visit('/users/me');
  });

  it('updates the user after Save', () => {
    fillProfileDataAndSave('Jian Yang', 'jian.yang@redash.io');
    cy.logout();
    cy.login('jian.yang@redash.io').its('status').should('eq', 200);
    cy.visit('/users/me');
    cy.contains('Jian Yang');
    fillProfileDataAndSave('Example Admin', 'admin@redash.io');
  });

  it('regenerates API Key', () => {
    cy.getByTestId('ApiKey').then(($apiKey) => {
      const previousApiKey = $apiKey.val();

      cy.getByTestId('RegenerateApiKey').click();
      cy.get('.ant-btn-primary').contains('Regenerate').click({ force: true });

      cy.getByTestId('ApiKey').should('not.eq', previousApiKey);
    });
  });

  it('takes a screenshot', () => {
    cy.getByTestId('ApiKey').then(($apiKey) => {
      $apiKey.val('secret');
    });
    cy.percySnapshot('User Profile');
  });

  context('changing password', () => {
    beforeEach(() => {
      cy.getByTestId('ChangePassword').click();
    });

    it('shows an error when current password is wrong', () => {
      fillChangePasswordAndSave('wrongpassword', 'newpassword', 'newpassword');
      cy.contains('Incorrect current password.');
    });

    it('shows an error when new password does not match repeat password', () => {
      fillChangePasswordAndSave('password', 'newpassword', 'differentpassword');
      cy.contains('Passwords don\'t match.');
    });
  });
});
