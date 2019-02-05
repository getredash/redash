import React from 'react';
import { react2angular } from 'react2angular';

import { PageHeader } from '@/components/PageHeader';
import { Paginator } from '@/components/Paginator';
import { DashboardTagsControl } from '@/components/tags-control/DashboardTagsControl';

import { wrap as liveItemsList, createResourceFetcher, ControllerType } from '@/components/items-list/LiveItemsList';
import LoadingState from '@/components/items-list/components/LoadingState';
import * as Sidebar from '@/components/items-list/components/Sidebar';
import ItemsTable, { Columns } from '@/components/items-list/components/ItemsTable';

import { Dashboard } from '@/services/dashboard';
import navigateTo from '@/services/navigateTo';
import { routesToAngularRoutes } from '@/lib/utils';

import DashboardListEmptyState from './DashboardListEmptyState';

import './dashboard-list.css';

class DashboardList extends React.Component {
  static defaultOrderBy = '-created_at';

  static propTypes = {
    controller: ControllerType.isRequired,
  };

  static routes = [
    {
      path: '/dashboards',
      title: 'Dashboards',
      key: 'all',
    },
    {
      path: '/dashboards/favorites',
      title: 'Favorite Dashboards',
      key: 'favorites',
    },
  ];

  static sidebarMenu = [
    {
      key: 'all',
      href: 'dashboards',
      title: 'All Dashboards',
    },
    {
      key: 'favorites',
      href: 'dashboards/favorites',
      title: 'Favorites',
      icon: () => <Sidebar.MenuIcon icon="fa fa-star" />,
    },
  ];

  static listColumns = [
    Columns.favorites({ className: 'p-r-0' }),
    Columns.custom.sortable((text, item) => (
      <React.Fragment>
        <a className="table-main-title" href={'dashboard/' + item.slug}>{ item.name }</a>
        <DashboardTagsControl
          className="d-block"
          tags={item.tags}
          isDraft={item.is_draft}
          isArchived={item.is_archived}
        />
      </React.Fragment>
    ), {
      title: 'Name',
      field: 'name',
      width: null,
    }),
    Columns.avatar({ field: 'user', className: 'p-l-0 p-r-0' }, name => `Created by ${name}`),
    Columns.dateTime.sortable({ title: 'Created At', field: 'created_at' }),
  ];

  static doRequest = createResourceFetcher(
    ({ currentPage }) => ({
      all: Dashboard.query.bind(Dashboard),
      favorites: Dashboard.favorites.bind(Dashboard),
    }[currentPage]),
    item => new Dashboard(item),
  );

  onTableRowClick = (event, item) => navigateTo('dashboard/' + item.slug);

  renderSidebar() {
    const { controller } = this.props;
    return (
      <React.Fragment>
        <Sidebar.SearchInput
          placeholder="Search Dashboards..."
          value={controller.searchTerm}
          onChange={controller.updateSearch}
        />
        <Sidebar.Menu items={this.constructor.sidebarMenu} selected={controller.currentPage} />
        <Sidebar.Tags url="api/dashboards/tags" onChange={controller.updateSelectedTags} />
        <Sidebar.PageSizeSelect
          options={controller.pageSizeOptions}
          value={controller.itemsPerPage}
          onChange={itemsPerPage => controller.updatePagination({ itemsPerPage })}
        />
      </React.Fragment>
    );
  }

  render() {
    const sidebar = this.renderSidebar();
    const { controller } = this.props;
    return (
      <div className="container">
        <PageHeader title={controller.title} />
        <div className="row">
          <div className="col-md-3 list-control-t">{sidebar}</div>
          <div className="list-content col-md-9">
            {!controller.isLoaded && <LoadingState />}
            {
              controller.isLoaded && controller.isEmpty && (
                <DashboardListEmptyState
                  page={controller.currentPage}
                  searchTerm={controller.searchTerm}
                  selectedTags={controller.selectedTags}
                />
              )
            }
            {
              controller.isLoaded && !controller.isEmpty && (
                <div className="bg-white tiled">
                  <ItemsTable
                    items={controller.pageItems}
                    columns={this.constructor.listColumns}
                    onRowClick={this.onTableRowClick}
                    orderByField={controller.orderByField}
                    orderByReverse={controller.orderByReverse}
                    toggleSorting={controller.toggleSorting}
                  />
                  <Paginator
                    totalCount={controller.totalItemsCount}
                    itemsPerPage={controller.itemsPerPage}
                    page={controller.page}
                    onChange={page => controller.updatePagination({ page })}
                  />
                </div>
              )
            }
          </div>
          <div className="col-md-3 list-control-r-b">{sidebar}</div>
        </div>
      </div>
    );
  }
}

export default function init(ngModule) {
  ngModule.component('pageDashboardList', react2angular(liveItemsList(DashboardList)));

  return routesToAngularRoutes(DashboardList.routes, {
    template: '<page-dashboard-list current-page="$resolve.currentPage"></page-dashboard-list>',
    reloadOnSearch: false,
  });
}

init.init = true;
