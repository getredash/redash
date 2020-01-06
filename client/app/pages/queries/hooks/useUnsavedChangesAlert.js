import { useRef, useEffect } from "react";
import { $rootScope } from "@/services/ng";

// TODO: This should be revisited and probably re-implemented when replacing Angular router with sth else
export default function useUnsavedChangesAlert(shouldShowAlert = false) {
  const shouldShowAlertRef = useRef();
  shouldShowAlertRef.current = shouldShowAlert;

  useEffect(() => {
    const unloadMessage = "You will lose your changes if you leave";
    const confirmMessage = `${unloadMessage}\n\nAre you sure you want to leave this page?`;
    // store original handler (if any)
    const savedOnBeforeUnload = window.onbeforeunload;

    window.onbeforeunload = function onbeforeunload() {
      return shouldShowAlertRef.current ? unloadMessage : undefined;
    };

    const unsubscribe = $rootScope.$on("$locationChangeStart", (event, next, current) => {
      if (next.split("?")[0] === current.split("?")[0] || next.split("#")[0] === current.split("#")[0]) {
        return;
      }

      if (shouldShowAlertRef.current && !window.confirm(confirmMessage)) {
        event.preventDefault();
      }
    });

    return () => {
      window.onbeforeunload = savedOnBeforeUnload;
      unsubscribe();
    };
  }, []);
}
