import Page from './Page';

class LoginPage extends Page {
  constructor() {
    super('/login');
    this.emailInput = '[data-testid=EmailInput]';
    this.passwordInput = '[data-testid=PasswordInput]';
    this.submitButton = '[data-testid=SubmitButton]';
    this.errorMessage = '[data-testid=ErrorMessage]';
  }

  fillEmail(value) {
    cy.get(this.emailInput)
      .clear()
      .type(value);

    return this;
  }

  fillPassword(value) {
    cy.get(this.passwordInput)
      .clear()
      .type(value);

    return this;
  }

  submit() {
    cy.get(this.submitButton).click();
  }

  validateTitle() {
    cy.title().should('eq', 'Login to Redash');
  }
}

export default LoginPage;
