import { isString } from "lodash";
import { $location, $rootScope, $route } from "@/services/ng";

export default function navigateTo(url, replace = false, reload = true) {
  if (isString(url)) {
    // Allows changing the URL without reloading
    // ANGULAR_REMOVE_ME Revisit when some React router will be used
    if (!reload) {
      const lastRoute = $route.current;
      const un = $rootScope.$on("$locationChangeSuccess", () => {
        $route.current = lastRoute;
        un();
      });
    }
    $location.url(url);
    if (replace) {
      $location.replace();
    }
    $rootScope.$applyAsync();
  }
}
