(function () {
    var notifications = function (Events) {
        var notificationService = {};

        notificationService.isSupported = function () {
            if ("Notification" in window) {
                return true;
            } else {
                console.log("HTML5 notifications are not supported.");
                return false;
            }
        }

        notificationService.getPermissions = function () {
            if (!this.isSupported()) {
                return;
            }

            if (Notification.permission !== "granted") {
	        Notification.requestPermission(function (status) {
	            if (Notification.permission !== status) {
                        Notification.permission = status;
                    }
                });
            }
        }

        notificationService.showNotification = function (title, content) {
            if (!this.isSupported()) {
                return;
            }

            //using the 'tag' to avoid showing duplicate notifications
            var notification = new Notification(title, {'tag': title+content, 'body': content});
            setTimeout(function(){
                 notification.close();
                },3000);
            notification.onclick = function () {
                window.focus();
                this.cancel();
                Events.record(currentUser, 'click', 'notification');
            };
        }

        return notificationService;
    }

    angular.module('redash.services')
        .factory('notifications', ['Events', notifications]);
})();
