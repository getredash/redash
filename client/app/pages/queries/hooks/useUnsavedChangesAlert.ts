import { useRef, useEffect } from "react";
import location from "@/services/location";

export default function useUnsavedChangesAlert(shouldShowAlert = false) {
  const shouldShowAlertRef = useRef();
  // @ts-expect-error ts-migrate(2322) FIXME: Type 'boolean' is not assignable to type 'undefine... Remove this comment to see the full error message
  shouldShowAlertRef.current = shouldShowAlert;

  useEffect(() => {
    const unloadMessage = "You will lose your changes if you leave";
    const confirmMessage = `${unloadMessage}\n\nAre you sure you want to leave this page?`;
    // store original handler (if any)
    const savedOnBeforeUnload = window.onbeforeunload;

    window.onbeforeunload = function onbeforeunload() {
      return shouldShowAlertRef.current ? unloadMessage : undefined;
    };

    const unsubscribe = location.confirmChange((nextLocation: any, currentLocation: any) => {
      if (shouldShowAlertRef.current && nextLocation.path !== currentLocation.path) {
        return confirmMessage;
      }
    });

    return () => {
      window.onbeforeunload = savedOnBeforeUnload;
      unsubscribe();
    };
  }, []);
}
