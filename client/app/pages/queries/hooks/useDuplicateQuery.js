import { noop } from "lodash";
import { useCallback, useState } from "react";
import { Query } from "@/services/query";

export default function useDuplicateQuery(query) {
  const [isDuplicating, setIsDuplicating] = useState(false);

  const duplicateQuery = useCallback(() => {
    // To prevent opening the same tab, name must be unique for each browser
    const tabName = `duplicatedQueryTab/${Math.random().toString()}`;

    // We should open tab here because this moment is a part of user interaction;
    // later browser will block such attempts
    const tab = window.open("", tabName);

    setIsDuplicating(true);
    Query.fork({ id: query.id })
      .then(newQuery => {
        tab.location = newQuery.getUrl(true);
      })
      .finally(() => {
        setIsDuplicating(false);
      });
  }, [query.id]);

  return [isDuplicating, isDuplicating ? noop : duplicateQuery];
}
