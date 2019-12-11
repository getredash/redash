export default class PromiseRejectionError extends Error {
  constructor(rejection) {
    let message;
    if (rejection.status !== undefined) {
      if (rejection.status === 404) {
        message = "It seems like the page you're looking for cannot be found.";
      } else if (rejection.status === 403 || rejection.status === 401) {
        message = "It seems like you don’t have permission to see this page.";
      } else if (rejection.data && rejection.data.error) {
        message = rejection.data.error;
      }
    }

    if (message === undefined) {
      message = "It seems like we encountered an error. Try refreshing this page or contact your administrator.";
    }

    super(message);
    this.rejection = rejection;
  }
}
