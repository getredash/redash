import debug from 'debug';

const logger = debug('redash:notifications');

function Notifications(currentUser, Events) {
  const notificationService = { pageVisible: true };

  notificationService.monitorVisibility = function monitorVisibility() {
    let hidden;
    let visibilityChange;

    if (typeof document.hidden !== 'undefined') {
      hidden = 'hidden';
      visibilityChange = 'visibilitychange';
    } else if (typeof document.msHidden !== 'undefined') {
      hidden = 'msHidden';
      visibilityChange = 'msvisibilitychange';
    }

    let documentHidden = document[hidden];

    document.addEventListener(visibilityChange, () => {
      if (documentHidden !== document[hidden]) {
        if (document[hidden]) {
          notificationService.pageVisible = false;
        } else {
          notificationService.pageVisible = true;
        }

        documentHidden = document[hidden];
      }
    });
  };

  notificationService.monitorVisibility();

  notificationService.isSupported = () => {
    if ('Notification' in window) {
      return true;
    }

    logger('HTML5 notifications are not supported.');
    return false;
  };

  notificationService.getPermissions = function getPermissions() {
    if (!this.isSupported()) {
      return;
    }

    if (Notification.permission === 'default') {
      Notification.requestPermission((status) => {
        if (Notification.permission !== status) {
          Notification.permission = status;
        }
      });
    }
  };

  notificationService.showNotification = function showNotification(title, content) {
    if (!this.isSupported() || this.pageVisible || Notification.permission !== 'granted') {
      return;
    }

    // using the 'tag' to avoid showing duplicate notifications
    const notification = new Notification(title, { tag: title + content, body: content, icon: '/images/redash_icon_small.png' });
    setTimeout(() => {
      notification.close();
    }, 3000);
    notification.onclick = function onClick() {
      window.focus();
      this.close();
      Events.record('click', 'notification');
    };
  };

  return notificationService;
}


export default function init(ngModule) {
  ngModule.factory('Notifications', Notifications);
}

init.init = true;

