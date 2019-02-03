import { map } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import { react2angular } from 'react2angular';

import { PageHeader } from '@/components/PageHeader';
import { Paginator } from '@/components/Paginator';
import { DashboardTagsControl } from '@/components/tags-control/DashboardTagsControl';

import LiveItemsList from '@/components/items-list/LiveItemsList';
import LoadingState from '@/components/items-list/components/LoadingState';
import * as Sidebar from '@/components/items-list/components/Sidebar';
import ItemsTable, { Columns } from '@/components/items-list/components/ItemsTable';

import { Dashboard } from '@/services/dashboard';
import navigateTo from '@/services/navigateTo';
import { routesToAngularRoutes } from '@/lib/utils';

import DashboardListEmptyState from './DashboardListEmptyState';

import './dashboard-list.css';

class DashboardList extends React.Component {
  static propTypes = {
    currentPage: PropTypes.string.isRequired,
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

  constructor(props) {
    super(props);

    const resources = {
      all: Dashboard.query.bind(Dashboard),
      favorites: Dashboard.favorites.bind(Dashboard),
    };
    const resource = resources[this.props.currentPage];

    this.controller = new LiveItemsList({
      doRequest: request => resource(request).$promise
        .then(({ results, count }) => ({
          count,
          results: map(results, item => new Dashboard(item)),
        })),
      onChange: ({ state }) => this.setState(state),
    });
    this.state = this.controller.state;

    this.onTableRowClick = (event, item) => navigateTo('dashboard/' + item.slug);
  }

  componentDidMount() {
    this.controller.update();
  }

  renderSidebar() {
    return (
      <React.Fragment>
        <Sidebar.SearchInput
          placeholder="Search Dashboards..."
          value={this.state.searchTerm}
          onChange={this.controller.updateSearch}
        />
        <Sidebar.Menu items={this.constructor.sidebarMenu} selected={this.props.currentPage} />
        <Sidebar.Tags url="api/dashboards/tags" onChange={this.controller.updateSelectedTags} />
        <Sidebar.PageSizeSelect
          options={this.state.pageSizeOptions}
          value={this.state.itemsPerPage}
          onChange={itemsPerPage => this.controller.updatePagination({ itemsPerPage })}
        />
      </React.Fragment>
    );
  }

  render() {
    const sidebar = this.renderSidebar();

    return (
      <div className="container">
        <PageHeader title={this.state.title} />
        <div className="row">
          <div className="col-md-3 list-control-t">{sidebar}</div>
          <div className="list-content col-md-9">
            {!this.state.isLoaded && <LoadingState />}
            {
              this.state.isLoaded && this.state.isEmpty && (
                <DashboardListEmptyState
                  page={this.props.currentPage}
                  searchTerm={this.state.searchTerm}
                  selectedTags={this.state.selectedTags}
                />
              )
            }
            {
              this.state.isLoaded && !this.state.isEmpty && (
                <div className="bg-white tiled">
                  <ItemsTable
                    items={this.state.pageItems}
                    columns={this.constructor.listColumns}
                    onRowClick={this.onTableRowClick}
                    orderByField={this.state.orderByField}
                    orderByReverse={this.state.orderByReverse}
                    toggleSorting={this.controller.toggleSorting}
                  />
                  <Paginator
                    totalCount={this.state.totalItemsCount}
                    itemsPerPage={this.state.itemsPerPage}
                    page={this.state.page}
                    onChange={page => this.controller.updatePagination({ page })}
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
  ngModule.component('pageDashboardList', react2angular(DashboardList));

  return routesToAngularRoutes(DashboardList.routes, {
    template: '<page-dashboard-list current-page="$resolve.currentPage"></page-dashboard-list>',
    reloadOnSearch: false,
  });
}

init.init = true;
