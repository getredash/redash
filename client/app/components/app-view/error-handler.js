import { EventEmitter } from 'events';

// eslint-disable-next-line import/prefer-default-export
export class ErrorHandler extends EventEmitter {
  constructor() {
    super();
    this.logToConsole = true;
    this.reset();
  }

  reset() {
    this.error = null;
    this.emit('change');
  }

  process(error) {
    this.reset();
    if (this.logToConsole) {
      // Log raw error object
      // eslint-disable-next-line no-console
      console.error(error);
    }
    this.error = error;
    this.emit('change');
  }
}
