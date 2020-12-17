import React from "react";
import BigMessage from "@/components/BigMessage";

// Default "list empty" message for list pages
export default function EmptyState(props: any) {
  return (
    <div className="text-center">
      <BigMessage icon="fa-search" message="Sorry, we couldn't find anything." {...props} />
    </div>
  );
}
