import { extend, map } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import { react2angular } from 'react2angular';

import { PageHeader } from '@/components/PageHeader';
import { FavoritesControl } from '@/components/FavoritesControl';
import { QueryTagsControl } from '@/components/tags-control/QueryTagsControl';
import { SchedulePhrase } from '@/components/queries/SchedulePhrase';

import ItemsListContext from '@/components/items-list/ItemsListContext';

import LiveItemsList from '@/components/items-list/LiveItemsList';
import LoadingState from '@/components/items-list/components/LoadingState';
import Sidebar from '@/components/items-list/components/Sidebar';
import ItemsTable from '@/components/items-list/components/ItemsTable';

import { Query } from '@/services/query';
import { currentUser } from '@/services/auth';
import navigateTo from '@/services/navigateTo';
import { durationHumanize } from '@/filters';
import { formatDateTime } from '@/filters/datetime';

import QueriesListEmptyState from './QueriesListEmptyState';

import './queries-list.css';

class QueriesList extends React.Component {
  static propTypes = {
    currentPage: PropTypes.string.isRequired,
  };

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
      icon: 'fa fa-star',
    },
    {
      key: 'my',
      href: 'queries/my',
      title: 'My Queries',
      icon: () => (
        <img src={currentUser.profile_image_url} className="profile__image--navbar m-r-5" width="13" alt={currentUser.name} />
      ),
      isAvailable: () => currentUser.hasPermission('create_query'),
    },
  ];

  static listColumns = [
    {
      width: '33px',
      className: 'p-r-0',
      render: (text, item) => (
        <FavoritesControl item={item} />
      ),
    },
    {
      title: 'Name',
      field: 'name',
      sorter: true,
      render: (text, item) => (
        <React.Fragment>
          <a className="table-main-title" href={'dashboard/' + item.slug}>{ item.name }</a>
          <QueryTagsControl
            className="d-block"
            tags={item.tags}
            isDraft={item.is_draft}
            isArchived={item.is_archived}
          />
        </React.Fragment>
      ),
    },
    {
      width: '1%',
      className: 'p-r-0',
      render: (text, item) => (
        <img
          src={item.user.profile_image_url}
          className="profile__image_thumb m-r-5"
          alt={'Created by ' + item.user.name}
          title={'Created by ' + item.user.name}
        />
      ),
    },
    {
      title: 'Created At',
      field: 'created_at',
      width: '1%',
      className: 'text-nowrap',
      sorter: true,
      render: text => formatDateTime(text),
    },
    {
      title: 'Runtime',
      field: 'runtime',
      width: '1%',
      className: 'text-nowrap',
      sorter: true,
      render: text => durationHumanize(text),
    },
    {
      title: 'Last Executed At',
      field: 'retrieved_at',
      orderByField: 'executed_at',
      width: '1%',
      className: 'text-nowrap',
      sorter: true,
      render: text => formatDateTime(text),
    },
    {
      title: 'Update Schedule',
      field: 'schedule',
      width: '1%',
      className: 'text-nowrap',
      sorter: true,
      render: (text, item) => (
        <SchedulePhrase schedule={item.schedule} isNew={item.isNew()} />
      ),
    },
  ];

  constructor(props) {
    super(props);
    const resources = {
      all: Query.query.bind(Query),
      my: Query.myQueries.bind(Query),
      favorites: Query.favorites.bind(Query),
    };
    const resource = resources[this.props.currentPage];
    this.doRequest = request => resource(request).$promise
      .then(({ results, count }) => ({
        count,
        results: map(results, item => new Query(item)),
      }));

    this.onTableRowClick = (event, item) => navigateTo('queries/' + item.id);
  }

  render() {
    const sidebar = (
      <Sidebar
        searchPlaceholder="Search Queries..."
        menuItems={this.constructor.sidebarMenu}
        selectedItem={this.props.currentPage}
        tagsUrl="api/queries/tags"
      />
    );

    return (
      <LiveItemsList doRequest={this.doRequest}>
        <div className="container">
          <ItemsListContext.Consumer>
            {context => (
              <React.Fragment>
                <PageHeader title={context.title} />
                <div className="row">
                  <div className="col-md-3 list-control-t">{sidebar}</div>
                  <div className="list-content col-md-9">
                    {!context.isLoaded && <LoadingState />}
                    {
                      context.isLoaded && context.isEmpty &&
                      <QueriesListEmptyState page={this.props.currentPage} />
                    }
                    {
                      context.isLoaded && !context.isEmpty &&
                      <ItemsTable columns={this.constructor.listColumns} onRowClick={this.onTableRowClick} />
                    }
                  </div>
                  <div className="col-md-3 list-control-r-b">{sidebar}</div>
                </div>
              </React.Fragment>
            )}
          </ItemsListContext.Consumer>
        </div>
      </LiveItemsList>
    );
  }
}

export default function init(ngModule) {
  ngModule.component('pageQueriesList', react2angular(QueriesList));

  const route = {
    template: '<page-queries-list current-page="$resolve.currentPage"></page-queries-list>',
    reloadOnSearch: false,
  };

  return {
    '/queries': extend(
      {
        title: 'Queries',
        resolve: {
          currentPage: () => 'all',
        },
      },
      route,
    ),
    '/queries/my': extend(
      {
        title: 'My Queries',
        resolve: {
          currentPage: () => 'my',
        },
      },
      route,
    ),
    '/queries/favorites': extend(
      {
        title: 'Favorite Queries',
        resolve: {
          currentPage: () => 'favorites',
        },
      },
      route,
    ),
    // TODO: setup redirect?
    // '/queries/search':
  };
}

init.init = true;
