import PromiseRejectionError from "@/lib/promise-rejection-error";

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
    this.reset();
    if (this.logToConsole) {
      // Log raw error object
      // eslint-disable-next-line no-console
      console.error(error);
    }
    if (error === null || error instanceof PromiseRejectionError) {
      this.error = error;
    }
  }
}
