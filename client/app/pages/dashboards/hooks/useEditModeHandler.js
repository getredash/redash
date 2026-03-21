import { debounce, find, has, isMatch, map, pickBy } from "lodash";
import { useCallback, useEffect, useMemo, useState } from "react";
import useImmutableCallback from "@/lib/hooks/useImmutableCallback";
import location from "@/services/location";
import notification from "@/services/notification";

export const DashboardStatusEnum = {
  SAVED: "saved",
  SAVING: "saving",
  SAVING_FAILED: "saving_failed",
};

function getChangedPositions(widgets, nextPositions = {}) {
  return pickBy(nextPositions, (nextPos, widgetId) => {
    const widget = find(widgets, { id: Number(widgetId) });
    const prevPos = widget.options.position;
    return !isMatch(prevPos, nextPos);
  });
}

export default function useEditModeHandler(canEditDashboard, widgets) {
  const [editingLayout, setEditingLayout] = useState(canEditDashboard && has(location.search, "edit"));
  const [dashboardStatus, setDashboardStatus] = useState(DashboardStatusEnum.SAVED);
  const [recentPositions, setRecentPositions] = useState([]);
  const [doneBtnClickedWhileSaving, setDoneBtnClickedWhileSaving] = useState(false);

  useEffect(() => {
    location.setSearch({ edit: editingLayout ? true : null }, true);
  }, [editingLayout]);

  useEffect(() => {
    if (doneBtnClickedWhileSaving && dashboardStatus === DashboardStatusEnum.SAVED) {
      setDoneBtnClickedWhileSaving(false);
      setEditingLayout(false);
    }
  }, [doneBtnClickedWhileSaving, dashboardStatus]);

  const persistDashboardLayout = useCallback(
    (positions, { skipPendingState = false } = {}) => {
      if (!canEditDashboard) {
        setDashboardStatus(DashboardStatusEnum.SAVED);
        return;
      }

      const changedPositions = getChangedPositions(widgets, positions);

      if (!skipPendingState) {
        setDashboardStatus(DashboardStatusEnum.SAVING);
        setRecentPositions(positions);
      }

      const saveChangedWidgets = map(changedPositions, (position, id) => {
        // find widget
        const widget = find(widgets, { id: Number(id) });

        // skip already deleted widget
        if (!widget) {
          return Promise.resolve();
        }

        return widget.save("options", { position });
      });

      return Promise.all(saveChangedWidgets)
        .then(() => setDashboardStatus(DashboardStatusEnum.SAVED))
        .catch(() => {
          setDashboardStatus(DashboardStatusEnum.SAVING_FAILED);
          notification.error("Error saving changes.");
        });
    },
    [canEditDashboard, widgets]
  );

  const persistDashboardLayoutLatest = useImmutableCallback(persistDashboardLayout);

  const saveDashboardLayoutDebounced = useMemo(
    () =>
      debounce((positions) => {
        persistDashboardLayoutLatest(positions, { skipPendingState: true });
      }, 2000),
    [persistDashboardLayoutLatest]
  );

  useEffect(() => () => saveDashboardLayoutDebounced.cancel(), [saveDashboardLayoutDebounced]);

  const scheduleDashboardLayoutSave = useCallback(
    (positions) => {
      setDashboardStatus(DashboardStatusEnum.SAVING);
      setRecentPositions(positions);
      saveDashboardLayoutDebounced(positions);
    },
    [saveDashboardLayoutDebounced]
  );

  const retrySaveDashboardLayout = useCallback(
    () => persistDashboardLayout(recentPositions),
    [recentPositions, persistDashboardLayout]
  );

  const setEditing = useCallback(
    (editing) => {
      if (!editing && dashboardStatus !== DashboardStatusEnum.SAVED) {
        setDoneBtnClickedWhileSaving(true);
        saveDashboardLayoutDebounced.flush();
        return;
      }
      setEditingLayout(canEditDashboard && editing);
    },
    [dashboardStatus, canEditDashboard, saveDashboardLayoutDebounced]
  );

  return {
    editingLayout: canEditDashboard && editingLayout,
    setEditingLayout: setEditing,
    saveDashboardLayout: editingLayout ? scheduleDashboardLayoutSave : persistDashboardLayout,
    retrySaveDashboardLayout,
    doneBtnClickedWhileSaving,
    dashboardStatus,
  };
}
