import { isEmpty } from "lodash";
import { useMemo } from "react";
import PropTypes from "prop-types";
import { currentUser } from "@/services/auth";

export const QueryFlagsType = PropTypes.shape({
  isNew: PropTypes.bool,
  isDraft: PropTypes.bool,
  isArchived: PropTypes.bool,
  canEdit: PropTypes.bool,
  canViewSource: PropTypes.bool,
  canExecute: PropTypes.bool,
  canFork: PropTypes.bool,
  canSchedule: PropTypes.bool,
});

export default function useQueryFlags(query, dataSource = null) {
  dataSource = dataSource || { view_only: true };

  return useMemo(
    () => ({
      // state flags
      isNew: query.isNew(),
      isDraft: query.is_draft,
      isArchived: query.is_archived,

      // permissions flags
      canEdit: query.can_edit,
      canViewSource: currentUser.hasPermission("view_source"),
      canExecute:
        !isEmpty(query.query) &&
        !query.getParameters().hasPendingValues() &&
        (query.is_safe || (currentUser.hasPermission("execute_query") && !dataSource.view_only)),
      // TODO: Why user cannot fork query if data source is read-only?
      // canFork: currentUser.hasPermission("edit_query") && !dataSource.view_only,
      canFork: currentUser.hasPermission("edit_query"),
      canSchedule: currentUser.hasPermission("schedule_query"),
    }),
    [query, dataSource]
  );
}
