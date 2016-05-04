(function () {
  var notifications = function (Events) {
    var notificationService = {pageVisible: true};

    notificationService.monitorVisibility = function() {
      var hidden, visibilityState, visibilityChange;

      if (typeof document.hidden !== "undefined") {
        hidden = "hidden", visibilityChange = "visibilitychange", visibilityState = "visibilityState";
      } else if (typeof document.msHidden !== "undefined") {
        hidden = "msHidden", visibilityChange = "msvisibilitychange", visibilityState = "msVisibilityState";
      }

      var documentHidden = document[hidden];

      document.addEventListener(visibilityChange, function () {
        if (documentHidden != document[hidden]) {
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

    notificationService.isSupported = function () {
      if ("Notification" in window) {
        return true;
      } else {
        console.log("HTML5 notifications are not supported.");
        return false;
      }
    };

    notificationService.getPermissions = function () {
      if (!this.isSupported()) {
        return;
      }

      if (Notification.permission === "default") {
        Notification.requestPermission(function (status) {
          if (Notification.permission !== status) {
            Notification.permission = status;
          }
        });
      }
    }

    notificationService.showNotification = function (title, content) {
      if (!this.isSupported() || this.pageVisible || Notification.permission !== "granted") {
        return;
      }

      //using the 'tag' to avoid showing duplicate notifications
      var notification = new Notification(title, {'tag': title + content, 'body': content, 'icon': '/images/redash_icon_small.png'});
      setTimeout(function () {
        notification.close();
      }, 3000);
      notification.onclick = function () {
        window.focus();
        this.close();
        Events.record(currentUser, 'click', 'notification');
      };
    }

    return notificationService;
  }

  angular.module('redash.services')
    .factory('notifications', ['Events', notifications]);
})();
