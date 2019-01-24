import { find } from 'lodash';
import debug from 'debug';
import recordEvent from '@/services/record-event';

const logger = debug('redash:notifications');

const Notification = window.Notification || null;
if (!Notification) {
  logger('HTML5 notifications are not supported.');
}

const hidden = find(
  ['hidden', 'webkitHidden', 'mozHidden', 'msHidden'],
  prop => prop in document,
);
const visibilityChange = find(
  ['visibilitychange', 'webkitvisibilitychange', 'mozvisibilitychange', 'msvisibilitychange'],
  prop => prop in document,
);

class NotificationsService {
  constructor() {
    this.pageVisible = false;
    this.monitorVisibility();
  }

  // eslint-disable-next-line class-methods-use-this
  getPermissions() {
    if (Notification && (Notification.permission === 'default')) {
      Notification.requestPermission((status) => {
        if (Notification.permission !== status) {
          Notification.permission = status;
        }
      });
    }
  }

  monitorVisibility() {
    this.pageVisible = !document[hidden];
    let documentHidden = document[hidden];

    document.addEventListener(visibilityChange, () => {
      if (documentHidden !== document[hidden]) {
        this.pageVisible = !document[hidden];
        documentHidden = document[hidden];
      }
    });
  }

  showNotification(title, content) {
    if (!Notification || this.pageVisible || (Notification.permission !== 'granted')) {
      return;
    }

    // using the 'tag' to avoid showing duplicate notifications
    const notification = new Notification(title, {
      tag: title + content,
      body: content,
      icon: '/images/redash_icon_small.png',
    });
    setTimeout(() => {
      notification.close();
    }, 3000);
    notification.onclick = function onClick() {
      window.focus();
      this.close();
      recordEvent('click', 'notification');
    };
  }
}

export default new NotificationsService();
