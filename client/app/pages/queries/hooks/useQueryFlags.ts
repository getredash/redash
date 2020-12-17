import { isNil, isEmpty } from "lodash";
import { useMemo } from "react";
import { currentUser } from "@/services/auth";
import { policy } from "@/services/policy";

export default function useQueryFlags(query: any, dataSource = null) {
  // @ts-expect-error ts-migrate(2322) FIXME: Type '{ view_only: boolean; }' is not assignable t... Remove this comment to see the full error message
  dataSource = dataSource || { view_only: true };

  return useMemo(
    () => ({
      // state flags
      isNew: isNil(query.id),
      isDraft: query.is_draft,
      isArchived: query.is_archived,

      // permissions flags
      canCreate: currentUser.hasPermission("create_query"),
      canView: currentUser.hasPermission("view_query"),
      canEdit: currentUser.hasPermission("edit_query") && policy.canEdit(query),
      canViewSource: currentUser.hasPermission("view_source"),
      canExecute:
        !isEmpty(query.query) &&
        // @ts-expect-error ts-migrate(2554) FIXME: Expected 0 arguments, but got 1.
        policy.canRun(query) &&
        // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
        (query.is_safe || (currentUser.hasPermission("execute_query") && !dataSource.view_only)),
      // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
      canFork: currentUser.hasPermission("edit_query") && !dataSource.view_only,
      canSchedule: currentUser.hasPermission("schedule_query"),
    }),
    // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
    [query, dataSource.view_only]
  );
}
