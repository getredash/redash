import { debounce, find, has, isMatch, map, pickBy } from "lodash";
import { useCallback, useEffect, useState } from "react";
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

  const saveDashboardLayout = useCallback(
    positions => {
      if (!canEditDashboard) {
        setDashboardStatus(DashboardStatusEnum.SAVED);
        return;
      }

      const changedPositions = getChangedPositions(widgets, positions);

      setDashboardStatus(DashboardStatusEnum.SAVING);
      setRecentPositions(positions);
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

  const saveDashboardLayoutDebounced = useCallback(
    (...args) => {
      setDashboardStatus(DashboardStatusEnum.SAVING);
      return debounce(() => saveDashboardLayout(...args), 2000)();
    },
    [saveDashboardLayout]
  );

  const retrySaveDashboardLayout = useCallback(() => saveDashboardLayout(recentPositions), [
    recentPositions,
    saveDashboardLayout,
  ]);

  const setEditing = useCallback(
    editing => {
      if (!editing && dashboardStatus !== DashboardStatusEnum.SAVED) {
        setDoneBtnClickedWhileSaving(true);
        return;
      }
      setEditingLayout(canEditDashboard && editing);
    },
    [dashboardStatus, canEditDashboard]
  );

  return {
    editingLayout: canEditDashboard && editingLayout,
    setEditingLayout: setEditing,
    saveDashboardLayout: editingLayout ? saveDashboardLayoutDebounced : saveDashboardLayout,
    retrySaveDashboardLayout,
    doneBtnClickedWhileSaving,
    dashboardStatus,
  };
}
