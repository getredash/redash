import React from "react";
import BigMessage from "@/components/BigMessage";
import { TagsControl } from "@/components/tags-control/TagsControl";

type Props = {
    objectType: string;
    tags: any[] | {
        // @ts-expect-error ts-migrate(2314) FIXME: Generic type 'Set<T>' requires 1 type argument(s).
        [key: string]: Set;
    };
};

export default function NoTaggedObjectsFound({ objectType, tags }: Props) {
  return (
    // @ts-expect-error ts-migrate(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message
    <BigMessage icon="fa-tags">
      No {objectType} found tagged with&nbsp;
      {/* @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call. */}
      <TagsControl className="inline-tags-control" tags={Array.from(tags)} tagSeparator={"+"} />.
    </BigMessage>
  );
}
