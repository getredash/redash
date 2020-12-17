import { filter, find, toString } from "lodash";
import { useState, useMemo, useEffect } from "react";
import DataSource from "@/services/data-source";
export default function useQueryDataSources(query: any) {
    const [allDataSources, setAllDataSources] = useState([]);
    const [dataSourcesLoaded, setDataSourcesLoaded] = useState(false);
    const dataSources = useMemo(() => filter(allDataSources, ds => !(ds as any).view_only || (ds as any).id === query.data_source_id), [
        allDataSources,
        query.data_source_id,
    ]);
    const dataSource = useMemo(() => find(dataSources, ds => toString((ds as any).id) === toString(query.data_source_id)) || null, [query.data_source_id, dataSources]);
    useEffect(() => {
        let cancelDataSourceLoading = false;
        DataSource.query().then(data => {
            if (!cancelDataSourceLoading) {
                setDataSourcesLoaded(true);
                // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'AxiosResponse<any>' is not assig... Remove this comment to see the full error message
                setAllDataSources(data);
            }
        });
        return () => {
            cancelDataSourceLoading = true;
        };
    }, []);
    return useMemo(() => ({ dataSourcesLoaded, dataSources, dataSource }), [dataSourcesLoaded, dataSources, dataSource]);
}
