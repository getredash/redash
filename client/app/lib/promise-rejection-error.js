export default class PromiseRejectionError extends Error {
  constructor(rejection) {
    let message;
    switch (rejection.status) {
      case 403: message = 'You have no permissions to view this page.'; break;
      default: message = rejection.data.message; break;
    }
    super(message);
    this.rejection = rejection;
  }
}
