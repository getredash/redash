import { isEmpty } from "lodash";
import React, { useEffect, useState } from "react";

import Link from "@/components/Link";
import LoadingOutlinedIcon from "@ant-design/icons/LoadingOutlined";

import { Dashboard } from "@/services/dashboard";
import { Query } from "@/services/query";

type OwnFavoriteListProps = {
    title: string;
    resource: (...args: any[]) => any;
    itemUrl: (...args: any[]) => any;
    emptyState?: React.ReactNode;
};

type FavoriteListProps = OwnFavoriteListProps & typeof FavoriteList.defaultProps;

export function FavoriteList({ title, resource, itemUrl, emptyState }: FavoriteListProps) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    resource
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'favorites' does not exist on type '(...a... Remove this comment to see the full error message
      .favorites()
      .then(({
      results
    }: any) => setItems(results))
      .finally(() => setLoading(false));
  }, [resource]);

  return (
    <>
      <div className="d-flex align-items-center m-b-20">
        <p className="flex-fill f-500 c-black m-0">{title}</p>
        {loading && <LoadingOutlinedIcon />}
      </div>
      {!isEmpty(items) && (
        <div className="list-group">
          {items.map(item => (
            <Link key={itemUrl(item)} className="list-group-item" href={itemUrl(item)}>
              <span className="btn-favourite m-r-5">
                <i className="fa fa-star" aria-hidden="true" />
              </span>
              {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'name' does not exist on type 'never'. */}
              {item.name}
              {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'is_draft' does not exist on type 'never'... Remove this comment to see the full error message */}
              {item.is_draft && <span className="label label-default m-l-5">Unpublished</span>}
            </Link>
          ))}
        </div>
      )}
      {isEmpty(items) && !loading && emptyState}
    </>
  );
}
FavoriteList.defaultProps = { emptyState: null };

export function DashboardAndQueryFavoritesList() {
  return (
    <div className="tile">
      <div className="t-body tb-padding">
        <div className="row home-favorites-list">
          <div className="col-sm-6 m-t-20">
            <FavoriteList
              title="Favorite Dashboards"
              resource={Dashboard}
              itemUrl={dashboard => dashboard.url}
              // @ts-expect-error ts-migrate(2322) FIXME: Type 'Element' is not assignable to type 'null | u... Remove this comment to see the full error message
              emptyState={
                <p>
                  <span className="btn-favourite m-r-5">
                    <i className="fa fa-star" aria-hidden="true" />
                  </span>
                  Favorite <Link href="dashboards">Dashboards</Link> will appear here
                </p>
              }
            />
          </div>
          <div className="col-sm-6 m-t-20">
            <FavoriteList
              title="Favorite Queries"
              // @ts-expect-error ts-migrate(2322) FIXME: Type 'typeof Query' is not assignable to type '(..... Remove this comment to see the full error message
              resource={Query}
              itemUrl={query => `queries/${query.id}`}
              // @ts-expect-error ts-migrate(2322) FIXME: Type 'Element' is not assignable to type 'null | u... Remove this comment to see the full error message
              emptyState={
                <p>
                  <span className="btn-favourite m-r-5">
                    <i className="fa fa-star" aria-hidden="true" />
                  </span>
                  Favorite <Link href="queries">Queries</Link> will appear here
                </p>
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
