import { isNil, isEmpty } from "lodash";
import { useMemo } from "react";
import { currentUser } from "@/services/auth";

export default function useQueryFlags(query, dataSource = null) {
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
      canEdit: currentUser.hasPermission("edit_query") && query.can_edit,
      canViewSource: currentUser.hasPermission("view_source"),
      canExecute:
        !isEmpty(query.query) &&
        (query.is_safe || (currentUser.hasPermission("execute_query") && !dataSource.view_only)),
      canFork: currentUser.hasPermission("edit_query") && !dataSource.view_only,
      canSchedule: currentUser.hasPermission("schedule_query"),
    }),
    [query, dataSource.view_only]
  );
}
