var durationHumanize = function (duration) {
    var humanized = "";
    if (duration == undefined) {
        humanized = "-";
    } else if (duration < 60) {
        humanized = Math.round(duration) + "s";
    } else if (duration >= 3600) {
        var hours = Math.round(parseFloat(duration) / 60.0 / 60.0)
        humanized = hours + "h";
    } else {
        var minutes = Math.round(parseFloat(duration) / 60.0);
        humanized = minutes + "m";
    }
    return humanized;
}

angular.module('redash.filters', []).
    filter('durationHumanize', function () {
        return durationHumanize;
    })

    .filter('refreshRateHumanize', function () {
        return function (ttl) {
            if (ttl==-1) {
                return "Never";
            } else {
                return "Every " + durationHumanize(ttl);
            }
        }
    })

    .filter('toHuman', function() {
        return function(text) {
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
    });