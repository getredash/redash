var durationHumanize = function (duration) {
  var humanized = "";
  if (duration == undefined) {
    humanized = "-";
  } else if (duration < 60) {
    humanized = Math.round(duration) + "s";
  } else if (duration > 3600 * 24) {
    var days = Math.round(parseFloat(duration) / 60.0 / 60.0 / 24.0);
    humanized = days + "days";
  } else if (duration >= 3600) {
    var hours = Math.round(parseFloat(duration) / 60.0 / 60.0);
    humanized = hours + "h";
  } else {
    var minutes = Math.round(parseFloat(duration) / 60.0);
    humanized = minutes + "m";
  }
  return humanized;
};

var urlPattern = /(^|[\s\n]|<br\/?>)((?:https?|ftp):\/\/[\-A-Z0-9+\u0026\u2019@#\/%?=()~_|!:,.;]*[\-A-Z0-9+\u0026@#\/%=~()_|])/gi;

angular.module('redash.filters', []).
  filter('durationHumanize', function () {
    return durationHumanize;
  })

  .filter('scheduleHumanize', function() {
    return function (schedule) {
      if (schedule === null) {
        return "Never";
      } else if (schedule.match(/\d\d:\d\d/) !== null) {
        var parts = schedule.split(':');
        var localTime = moment.utc().hour(parts[0]).minute(parts[1]).local().format('HH:mm');
        return "Every day at " + localTime;
      }

      return "Every " + durationHumanize(parseInt(schedule));
    }
  })

  .filter('toHuman', function () {
    return function (text) {
      return text.replace(/_/g, ' ').replace(/(?:^|\s)\S/g, function (a) {
        return a.toUpperCase();
      });
    }
  })

  .filter('colWidth', function () {
    return function (widgetWidth) {
      if (widgetWidth == 1) {
        return 4;
      } else if (widgetWidth == 2) {
        return 8;
      } else {
        return 12;
      }
    }
  })

  .filter('capitalize', function () {
    return function (text) {
      if (text) {
        return _.str.capitalize(text);
      } else {
        return null;
      }

    }
  })

  .filter('linkify', function () {
    return function (text) {
      return text.replace(urlPattern, "$1<a href='$2' target='_blank'>$2</a>");
    };
  })

  .filter('markdown', ['$sce', function ($sce) {
    return function (text) {
      if (!text) {
        return "";
      }

      var html = marked(text);
      if (featureFlags.allowScriptsInUserInput) {
        html = $sce.trustAsHtml(html);
      }

      return html;
    }
  }])

  .filter('trustAsHtml', ['$sce', function ($sce) {
    return function (text) {
      if (!text) {
        return "";
      }
      return $sce.trustAsHtml(text);
    }
  }]);
