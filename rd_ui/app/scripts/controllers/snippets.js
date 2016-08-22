(function() {
  var SnippetsCtrl = function ($scope, $location, growl, Events, QuerySnippet) {
    Events.record(currentUser, "view", "page", "query_snippets");
    $scope.$parent.pageTitle = "Query Snippets";

    $scope.gridConfig = {
      isPaginationEnabled: true,
      itemsByPage: 20,
      maxSize: 8,
    };

    $scope.gridColumns = [
      {
        "label": "Trigger",
        "cellTemplate": '<a href="query_snippets/{{dataRow.id}}">{{dataRow.trigger}}</a>'
      },
      {
        "label": "Description",
        "map": "description"
      },
      {
        "label": "Snippet",
        "map": "snippet"
      },
      {
        'label': 'Created By',
        'map': 'user.name'
      },
      {
        'label': 'Updated At',
        'cellTemplate': '<span am-time-ago="dataRow.created_at"></span>'
      }
    ];

    $scope.snippets = [];
    QuerySnippet.query(function(snippets) {
      $scope.snippets = snippets;
    });
  };

  var SnippetCtrl = function ($scope, $routeParams, $http, $location, growl, Events, QuerySnippet) {
    $scope.$parent.pageTitle = "Query Snippets";
    $scope.snippetId = $routeParams.snippetId;
    Events.record(currentUser, "view", "query_snippet", $scope.snippetId);

    $scope.editorOptions = {
      mode: 'snippets',
      advanced: {
        behavioursEnabled: true,
        enableSnippets: false,
        autoScrollEditorIntoView: true,
      },
      onLoad: function(editor) {
        editor.$blockScrolling = Infinity;
        editor.getSession().setUseWrapMode(true);
        editor.setShowPrintMargin(false);
      }
    };

    $scope.saveChanges = function() {
      $scope.snippet.$save(function(snippet) {
        growl.addSuccessMessage("Saved.");
        if ($scope.snippetId === "new") {
          $location.path('/query_snippets/' + snippet.id).replace();
        }
      }, function() {
        growl.addErrorMessage("Failed saving snippet.");
      });
    }

    $scope.delete = function() {
      $scope.snippet.$delete(function() {
        $location.path('/query_snippets');
        growl.addSuccessMessage("Query snippet deleted.");
      }, function() {
        growl.addErrorMessage("Failed deleting query snippet.");
      });
    }

    if ($scope.snippetId == 'new') {
      $scope.snippet = new QuerySnippet({description: ""});
      $scope.canEdit = true;
    } else {
      $scope.snippet = QuerySnippet.get({id: $scope.snippetId}, function(snippet) {
        $scope.canEdit = currentUser.canEdit(snippet);
      });
    }
  };

  angular.module('redash.controllers')
    .controller('SnippetsCtrl', ['$scope', '$location', 'growl', 'Events', 'QuerySnippet', SnippetsCtrl])
    .controller('SnippetCtrl', ['$scope', '$routeParams', '$http', '$location', 'growl', 'Events', 'QuerySnippet', SnippetCtrl])
})();
