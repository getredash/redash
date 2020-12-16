import { filter, find, toString } from "lodash";
import { useState, useMemo, useEffect } from "react";
import DataSource from "@/services/data-source";

export default function useQueryDataSources(query: any) {
  const [allDataSources, setAllDataSources] = useState([]);
  const [dataSourcesLoaded, setDataSourcesLoaded] = useState(false);
  // @ts-expect-error ts-migrate(2339) FIXME: Property 'view_only' does not exist on type 'never... Remove this comment to see the full error message
  const dataSources = useMemo(() => filter(allDataSources, ds => !ds.view_only || ds.id === query.data_source_id), [
    allDataSources,
    query.data_source_id,
  ]);
  const dataSource = useMemo(
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'id' does not exist on type 'never'.
    () => find(dataSources, ds => toString(ds.id) === toString(query.data_source_id)) || null,
    [query.data_source_id, dataSources]
  );

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
