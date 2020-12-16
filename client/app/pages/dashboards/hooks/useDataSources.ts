import { filter } from "lodash";
import { useState, useEffect } from "react";
import DataSource from "@/services/data-source";

/**
 * Provides a list of all data sources, as well as a boolean to say whether they've been loaded
 */
export default function useDataSources() {
  const [allDataSources, setAllDataSources] = useState([]);
  const [dataSourcesLoaded, setDataSourcesLoaded] = useState(false);
  // @ts-expect-error ts-migrate(2339) FIXME: Property 'view_only' does not exist on type 'never... Remove this comment to see the full error message
  const dataSources = filter(allDataSources, ds => !ds.view_only);

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

  return { dataSourcesLoaded, dataSources };
}
