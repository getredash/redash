// eslint-disable-next-line import/prefer-default-export
export class ErrorHandler {
  constructor() {
    this.logToConsole = true;
    this.reset();
  }

  reset() {
    this.error = null;
  }

  process(error) {
    if (!(error instanceof Error)) {
      if (error.status && error.data) {
        switch (error.status) {
          case 403: error = new Error(''); break;
          default: error = new Error(error.data.message); break;
        }
      }
    }
    this.error = error;
    if (this.logToConsole) {
      // eslint-disable-next-line no-console
      console.error(error);
    }
  }
}
