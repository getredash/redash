import debug from "debug";
import { react2angular } from "react2angular";
import AppHeader from "@/components/app-header/AppHeader";
import PromiseRejectionError from "@/lib/promise-rejection-error";
import { ErrorHandler } from "./error-handler";
import template from "./template.html";

const logger = debug("redash:app-view");

const handler = new ErrorHandler();

const layouts = {
  default: {
    showHeader: true,
    bodyClass: false,
  },
  fixed: {
    showHeader: true,
    bodyClass: "fixed-layout",
  },
  defaultSignedOut: {
    showHeader: false,
  },
};

function selectLayout(route) {
  let layout = layouts.default;
  if (route.layout) {
    layout = layouts[route.layout] || layouts.default;
  } else if (!route.authenticated) {
    layout = layouts.defaultSignedOut;
  }
  return layout;
}

class AppViewComponent {
  constructor($rootScope, $route, Auth) {
    this.$rootScope = $rootScope;
    this.layout = layouts.defaultSignedOut;
    this.handler = handler;

    $rootScope.$on("$routeChangeStart", (event, route) => {
      this.handler.reset();

      // In case we're handling $routeProvider.otherwise call, there will be no
      // $$route.
      const $$route = route.$$route || { authenticated: true };

      if ($$route.authenticated) {
        // For routes that need authentication, check if session is already
        // loaded, and load it if not.
        logger("Requested authenticated route: ", route);
        if (!Auth.isAuthenticated()) {
          event.preventDefault();
          // Auth.requireSession resolves only if session loaded
          Auth.requireSession().then(() => {
            this.applyLayout($$route);
            $route.reload();
          });
        }
      }
    });

    $rootScope.$on("$routeChangeSuccess", (event, route) => {
      const $$route = route.$$route || { authenticated: true };
      this.applyLayout($$route);
      if (route.title) {
        document.title = route.title;
      }
    });

    $rootScope.$on("$routeChangeError", (event, current, previous, rejection) => {
      const $$route = current.$$route || { authenticated: true };
      this.applyLayout($$route);
      throw new PromiseRejectionError(rejection);
    });
  }

  applyLayout(route) {
    this.layout = selectLayout(route);
    this.$rootScope.bodyClass = this.layout.bodyClass;
  }
}

export default function init(ngModule) {
  ngModule.factory(
    "$exceptionHandler",
    () =>
      function exceptionHandler(exception) {
        handler.process(exception);
      }
  );

  ngModule.component("appHeader", react2angular(AppHeader));

  ngModule.component("appView", {
    template,
    controller: AppViewComponent,
  });
}
