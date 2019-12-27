import { filter, find } from "lodash";
import { useState, useMemo, useEffect } from "react";
import { DataSource } from "@/services/data-source";

export default function useQueryDataSources(query) {
  const [allDataSources, setAllDataSources] = useState([]);
  const [dataSourcesLoaded, setDataSourcesLoaded] = useState(false);
  const dataSources = useMemo(() => filter(allDataSources, ds => !ds.view_only || ds.id === query.data_source_id), [
    allDataSources,
    query.data_source_id,
  ]);
  const dataSource = useMemo(() => find(dataSources, { id: query.data_source_id }) || null, [
    query.data_source_id,
    dataSources,
  ]);

  useEffect(() => {
    let cancelDataSourceLoading = false;
    DataSource.query().$promise.then(data => {
      if (!cancelDataSourceLoading) {
        setDataSourcesLoaded(true);
        setAllDataSources(data);
      }
    });

    return () => {
      cancelDataSourceLoading = true;
    };
  }, []);

  return useMemo(() => ({ dataSourcesLoaded, dataSources, dataSource }), [dataSourcesLoaded, dataSources, dataSource]);
}
