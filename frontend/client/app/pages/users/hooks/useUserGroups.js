import { filter, includes, isArray } from "lodash";
import { useEffect, useMemo, useState } from "react";
import Group from "@/services/group";

export default function useUserGroups(user) {
  const [allGroups, setAllGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const groups = useMemo(() => filter(allGroups, group => includes(user.groupIds, group.id)), [allGroups, user]);

  useEffect(() => {
    let isCancelled = false;

    Group.query().then(groups => {
      if (!isCancelled) {
        setAllGroups(isArray(groups) ? groups : []);
        setIsLoading(false);
      }
    });
  }, []);

  return useMemo(() => ({ groups, allGroups, isLoading }), [groups, allGroups, isLoading]);
}
