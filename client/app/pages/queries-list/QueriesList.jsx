import { extend } from 'lodash';
import moment from 'moment';
import React from 'react';
import { react2angular } from 'react2angular';
import { FavoritesControl } from '@/components/FavoritesControl';
import { QueryTagsControl } from '@/components/tags-control/QueryTagsControl';
import { SchedulePhrase } from '@/components/queries/SchedulePhrase';
import { BigMessage } from '@/components/BigMessage';
import { NoTaggedObjectsFound } from '@/components/NoTaggedObjectsFound';
import { EmptyState } from '@/components/empty-state/EmptyState';
import ItemsList from '@/pages/ItemsList';
import { $location, $rootScope } from '@/services/ng';
import { Query } from '@/services/query';
import { currentUser } from '@/services/auth';
import { durationHumanize } from '@/filters';
import { formatDateTime } from '@/filters/datetime';
import './queries-list.css';

class QueriesList extends ItemsList {
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
    this._resource = resources[props.currentPage];
    this.state.showMyQueries = currentUser.hasPermission('create_query');
  }

  // eslint-disable-next-line class-methods-use-this
  onRowClick(event, query) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
      // keep default browser behavior
      return;
    }
    event.preventDefault();
    $location.url('queries/' + query.id);
    $rootScope.$applyAsync();
  }

  doRequest(request) {
    return this._resource(request).$promise;
  }

  processResponse(data) {
    super.processResponse(data);
    const rows = data.results.map((query) => {
      query.created_at = moment(query.created_at);
      query.retrieved_at = moment(query.retrieved_at);
      return new Query(query);
    });

    this.state.paginator.updateRows(rows, data.count);

    const isEmpty = data.count === 0;
    let emptyType = null;
    if (isEmpty) {
      if (this.isInSearchMode) {
        emptyType = 'search';
      } else if (this.state.selectedTags.length > 0) {
        emptyType = 'tags';
      } else {
        emptyType = this.props.currentPage;
      }
    }

    this.setState({ isEmpty, emptyType });
  }

  renderEmptyState() {
    const { emptyType, selectedTags } = this.state;

    switch (emptyType) {
      case 'search': return (
        <BigMessage message="Sorry, we couldn't find anything." icon="fa-search" />
      );
      case 'tags': return (
        <NoTaggedObjectsFound objectType="queries" tags={selectedTags} />
      );
      case 'favorites': return (
        <BigMessage message="Mark queries as Favorite to list them here." icon="fa-star" />
      );
      case 'my': return (
        <div className="tiled bg-white p-15">
          <a href="queries/new" className="btn btn-primary btn-sm">Create your first query</a> to populate My Queries
          list. Need help? Check out our
          <a href="https://redash.io/help/user-guide/querying/writing-queries">query writing documentation</a>.
        </div>
      );
      default: return (
        <EmptyState
          icon="fa fa-code"
          illustration="query"
          description="Getting the data from your datasources."
          helpLink="https://help.redash.io/category/21-querying"
        />
      );
    }
  }

  renderSearchInput() {
    return super.renderSearchInput('Search Queries...');
  }

  renderTagsList() {
    return super.renderTagsList('api/queries/tags');
  }

  render() {
    return (
      <div className="container">{super.render()}</div>
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
