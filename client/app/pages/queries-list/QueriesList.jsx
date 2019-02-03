import { map } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import { react2angular } from 'react2angular';

import { PageHeader } from '@/components/PageHeader';
import { Paginator } from '@/components/Paginator';
import { QueryTagsControl } from '@/components/tags-control/QueryTagsControl';
import { SchedulePhrase } from '@/components/queries/SchedulePhrase';

import LiveItemsList from '@/components/items-list/LiveItemsList';
import LoadingState from '@/components/items-list/components/LoadingState';
import * as Sidebar from '@/components/items-list/components/Sidebar';
import ItemsTable, { Columns } from '@/components/items-list/components/ItemsTable';

import { Query } from '@/services/query';
import { currentUser } from '@/services/auth';
import navigateTo from '@/services/navigateTo';
import { routesToAngularRoutes } from '@/lib/utils';

import QueriesListEmptyState from './QueriesListEmptyState';

import './queries-list.css';

class QueriesList extends React.Component {
  static propTypes = {
    currentPage: PropTypes.string.isRequired,
  };

  static routes = [
    {
      path: '/queries',
      title: 'Queries',
      key: 'all',
    },
    {
      path: '/queries/favorites',
      title: 'Favorite Queries',
      key: 'favorites',
    },
    {
      path: '/queries/archive',
      title: 'Archived Queries',
      key: 'archive',
    },
    {
      path: '/queries/my',
      title: 'My Queries',
      key: 'my',
    },
  ];

  static sidebarMenu = [
    {
      key: 'all',
      href: 'queries',
      title: 'All Queries',
    },
    {
      key: 'favorites',
      href: 'queries/favorites',
      title: 'Favorites',
      icon: () => <Sidebar.MenuIcon icon="fa fa-star" />,
    },
    {
      key: 'archive',
      href: 'queries/archive',
      title: 'Archive',
      icon: () => <Sidebar.MenuIcon icon="fa fa-archive" />,
    },
    {
      key: 'my',
      href: 'queries/my',
      title: 'My Queries',
      icon: () => <Sidebar.ProfileImage user={currentUser} />,
      isAvailable: () => currentUser.hasPermission('create_query'),
    },
  ];

  static listColumns = [
    Columns.favorites({ className: 'p-r-0' }),
    Columns.custom.sortable((text, item) => (
      <React.Fragment>
        <a className="table-main-title" href={'dashboard/' + item.slug}>{ item.name }</a>
        <QueryTagsControl
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
    Columns.duration.sortable({ title: 'Runtime', field: 'runtime' }),
    Columns.dateTime.sortable({ title: 'Last Executed At', field: 'retrieved_at', orderByField: 'executed_at' }),
    Columns.custom.sortable(
      (text, item) => <SchedulePhrase schedule={item.schedule} isNew={item.isNew()} />,
      { title: 'Update Schedule', field: 'schedule' },
    ),
  ];

  constructor(props) {
    super(props);

    const resources = {
      all: Query.query.bind(Query),
      my: Query.myQueries.bind(Query),
      favorites: Query.favorites.bind(Query),
      archive: Query.archive.bind(Query),
    };
    const resource = resources[this.props.currentPage];

    this.controller = new LiveItemsList({
      doRequest: request => resource(request).$promise
        .then(({ results, count }) => ({
          count,
          results: map(results, item => new Query(item)),
        })),
      onChange: ({ state }) => this.setState(state),
    });
    this.state = this.controller.state;

    this.onTableRowClick = (event, item) => navigateTo('queries/' + item.id);
  }

  componentDidMount() {
    this.controller.update();
  }

  renderSidebar() {
    return (
      <React.Fragment>
        <Sidebar.SearchInput
          placeholder="Search Queries..."
          value={this.state.searchTerm}
          onChange={this.controller.updateSearch}
        />
        <Sidebar.Menu items={this.constructor.sidebarMenu} selected={this.props.currentPage} />
        <Sidebar.Tags url="api/queries/tags" onChange={this.controller.updateSelectedTags} />
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
                <QueriesListEmptyState
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
  ngModule.component('pageQueriesList', react2angular(QueriesList));

  return routesToAngularRoutes(QueriesList.routes, {
    template: '<page-queries-list current-page="$resolve.currentPage"></page-queries-list>',
    reloadOnSearch: false,
  });
}

init.init = true;
