import React from "react";
import PropTypes from "prop-types";
import BigMessage from "@/components/BigMessage";
import NoTaggedObjectsFound from "@/components/NoTaggedObjectsFound";
import EmptyState from "@/components/empty-state/EmptyState";

export default function QueriesListEmptyState({ page, searchTerm, selectedTags }) {
  if (searchTerm !== "") {
    return <BigMessage message="Sorry, we couldn't find anything." icon="fa-search" />;
  }
  if (selectedTags.length > 0) {
    return <NoTaggedObjectsFound objectType="queries" tags={selectedTags} />;
  }
  switch (page) {
    case "favorites":
      return <BigMessage message="Mark queries as Favorite to list them here." icon="fa-star" />;
    case "archive":
      return <BigMessage message="Archived queries will be listed here." icon="fa-archive" />;
    case "my":
      return (
        <div className="tiled bg-white p-15">
          <a href="queries/new" className="btn btn-primary btn-sm">
            Create your first query
          </a>{" "}
          to populate My Queries list. Need help? Check out our{" "}
          <a href="https://redash.io/help/user-guide/querying/writing-queries">query writing documentation</a>.
        </div>
      );
    default:
      return (
        <EmptyState
          icon="fa fa-code"
          illustration="query"
          description="Getting the data from your datasources."
          helpLink="https://help.redash.io/category/21-querying"
        />
      );
  }
}

QueriesListEmptyState.propTypes = {
  page: PropTypes.string.isRequired,
  searchTerm: PropTypes.string.isRequired,
  selectedTags: PropTypes.array.isRequired, // eslint-disable-line react/forbid-prop-types
};
