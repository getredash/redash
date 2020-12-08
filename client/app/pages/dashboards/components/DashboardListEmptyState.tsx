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
          <EmptyState
            icon="zmdi zmdi-view-quilt"
            description="See the big picture"
            illustration="dashboard"
            helpMessage={<EmptyStateHelpMessage helpTriggerType="DASHBOARDS" />}
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
