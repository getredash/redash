import { filter, includes, isArray } from "lodash";
import { useEffect, useMemo, useState } from "react";
import Group from "@/services/group";
export default function useUserGroups(user: any) {
    const [allGroups, setAllGroups] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const groups = useMemo(() => filter(allGroups, group => includes(user.groupIds, (group as any).id)), [allGroups, user]);
    useEffect(() => {
        const isCancelled = false;
        Group.query().then(groups => {
            if (!isCancelled) {
                // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'never[] | (AxiosResponse<any> & ... Remove this comment to see the full error message
                setAllGroups(isArray(groups) ? groups : []);
                setIsLoading(false);
            }
        });
    }, []);
    return useMemo(() => ({ groups, allGroups, isLoading }), [groups, allGroups, isLoading]);
}
