import * as React from "react";
import * as PropTypes from "prop-types";
import BigMessage from "@/components/BigMessage";
import NoTaggedObjectsFound from "@/components/NoTaggedObjectsFound";
import EmptyState, { EmptyStateHelpMessage } from "@/components/empty-state/EmptyState";
import DynamicComponent from "@/components/DynamicComponent";

export interface DashboardListEmptyStateProps {
  page: string;
  searchTerm: string;
  selectedTags: string[];
}

export default function DashboardListEmptyState({ page, searchTerm, selectedTags }: DashboardListEmptyStateProps) {
  if (searchTerm !== "") {
    return <BigMessage message="Sorry, we couldn't find anything." icon="fa-search" />;
  }
  if (selectedTags.length > 0) {
    return <NoTaggedObjectsFound objectType="dashboards" tags={selectedTags} />;
  }
  switch (page) {
    case "favorites":
      return <BigMessage message="Mark dashboards as Favorite to list them here." icon="fa-star" />;
    default:
      return (
        <DynamicComponent name="DashboardList.EmptyState">
          {/* @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call. */}
          <EmptyState
            // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'.
            icon="zmdi zmdi-view-quilt"
            // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'.
            description="See the big picture"
            // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'.
            illustration="dashboard"
            // @ts-expect-error ts-migrate(2322) FIXME: Type 'Element' is not assignable to type 'never'.
            helpMessage={<EmptyStateHelpMessage helpTriggerType="DASHBOARDS" />}
            // @ts-expect-error ts-migrate(2322) FIXME: Type 'boolean' is not assignable to type 'never'.
            showDashboardStep
          />
        </DynamicComponent>
      );
  }
}

DashboardListEmptyState.propTypes = {
  page: PropTypes.string.isRequired,
  searchTerm: PropTypes.string.isRequired,
  selectedTags: PropTypes.array.isRequired,
};
