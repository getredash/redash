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

  .filter('refreshRateHumanize', function () {
    return function (ttl) {
      if (ttl == -1) {
        return "Never";
      } else {
        return "Every " + durationHumanize(ttl);
      }
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
        return 6;
      }
      return 12;
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
      return $sce.trustAsHtml(marked(text));
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
