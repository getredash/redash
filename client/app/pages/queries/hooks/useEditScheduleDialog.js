import { isArray, isFunction, intersection } from "lodash";
import { useCallback, useRef } from "react";
import ScheduleDialog from "@/components/queries/ScheduleDialog";
import { clientConfig } from "@/services/auth";
import { policy } from "@/services/policy";
import { updateQuerySchedule } from "../utils";
import useQueryFlags from "./useQueryFlags";

export default function useEditScheduleDialog(query, onChange) {
  // We won't use flags that depend on data source
  const queryFlags = useQueryFlags(query);
  const onChangeRef = useRef(null);
  onChangeRef.current = isFunction(onChange) ? onChange : () => {};

  return useCallback(() => {
    if (!queryFlags.canEdit || !queryFlags.canSchedule) {
      return;
    }

    const intervals = clientConfig.queryRefreshIntervals;
    const allowedIntervals = policy.getQueryRefreshIntervals();
    const refreshOptions = isArray(allowedIntervals) ? intersection(intervals, allowedIntervals) : intervals;

    ScheduleDialog.showModal({
      schedule: query.schedule,
      refreshOptions,
    }).result.then(schedule => {
      updateQuerySchedule(query, schedule).then((...args) => {
        onChangeRef.current(...args);
      });
    });
  }, [query, queryFlags]);
}
