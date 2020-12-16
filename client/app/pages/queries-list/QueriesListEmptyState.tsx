import React from "react";
import Link from "@/components/Link";
import BigMessage from "@/components/BigMessage";
import NoTaggedObjectsFound from "@/components/NoTaggedObjectsFound";
import EmptyState, { EmptyStateHelpMessage } from "@/components/empty-state/EmptyState";
import DynamicComponent from "@/components/DynamicComponent";

type Props = {
    page: string;
    searchTerm: string;
    selectedTags: any[];
};

export default function QueriesListEmptyState({ page, searchTerm, selectedTags }: Props) {
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
          <Link.Button href="queries/new" type="primary" size="small">
            Create your first query
          </Link.Button>{" "}
          to populate My Queries list. Need help? Check out our{" "}
          <Link href="https://redash.io/help/user-guide/querying/writing-queries">query writing documentation</Link>.
        </div>
      );
    default:
      return (
        <DynamicComponent name="QueriesList.EmptyState">
          {/* @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call. */}
          <EmptyState
            // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'.
            icon="fa fa-code"
            // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'.
            illustration="query"
            // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'.
            description="Getting the data from your datasources."
            // @ts-expect-error ts-migrate(2322) FIXME: Type 'Element' is not assignable to type 'never'.
            helpMessage={<EmptyStateHelpMessage helpTriggerType="QUERIES" />}
          />
        </DynamicComponent>
      );
  }
}
