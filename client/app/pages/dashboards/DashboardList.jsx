import { extend } from 'lodash';
import moment from 'moment';
import React from 'react';
import { react2angular } from 'react2angular';
import { FavoritesControl } from '@/components/FavoritesControl';
import { DashboardTagsControl } from '@/components/tags-control/DashboardTagsControl';
import { BigMessage } from '@/components/BigMessage';
import { NoTaggedObjectsFound } from '@/components/NoTaggedObjectsFound';
import { EmptyState } from '@/components/empty-state/EmptyState';
import ItemsList from '@/pages/ItemsList';
import { $location, $rootScope } from '@/services/ng';
import { Dashboard } from '@/services/dashboard';
import { formatDateTime } from '@/filters/datetime';
import './dashboard-list.css';

class DashboardList extends ItemsList {
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
      icon: 'fa fa-star',
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
          <DashboardTagsControl
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
          className="profile__image_thumb"
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
  ];

  constructor(props) {
    super(props);
    const resources = {
      all: Dashboard.query.bind(Dashboard),
      favorites: Dashboard.favorites.bind(Dashboard),
    };
    this._resource = resources[props.currentPage];
  }

  // eslint-disable-next-line class-methods-use-this
  onRowClick(event, dashboard) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
      // keep default browser behavior
      return;
    }
    event.preventDefault();
    $location.url('dashboard/' + dashboard.slug);
    $rootScope.$applyAsync();
  }

  doRequest(request) {
    return this._resource(request).$promise;
  }

  processResponse(data) {
    super.processResponse(data);
    const rows = data.results.map((dashboard) => {
      dashboard.created_at = moment(dashboard.created_at);
      return new Dashboard(dashboard);
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
        <NoTaggedObjectsFound objectType="dashboards" tags={selectedTags} />
      );
      case 'favorites': return (
        <BigMessage message="Mark dashboards as Favorite to list them here." icon="fa-star" />
      );
      default: return (
        <EmptyState
          icon="zmdi zmdi-view-quilt"
          description="See the big picture"
          illustration="dashboard"
          helpLink="https://help.redash.io/category/22-dashboards"
          showDashboardStep
        />
      );
    }
  }

  renderSearchInput() {
    return super.renderSearchInput('Search Dashboards...');
  }

  renderTagsList() {
    return super.renderTagsList('api/dashboards/tags');
  }
}

export default function init(ngModule) {
  ngModule.component('pageDashboardList', react2angular(DashboardList));

  const route = {
    template: '<page-dashboard-list current-page="$resolve.currentPage"></page-dashboard-list>',
    reloadOnSearch: false,
  };

  return {
    '/dashboards': extend(
      {
        title: 'Dashboards',
        resolve: {
          currentPage: () => 'all',
        },
      },
      route,
    ),
    '/dashboards/favorites': extend(
      {
        title: 'Favorite Dashboards',
        resolve: {
          currentPage: () => 'favorites',
        },
      },
      route,
    ),
  };
}

init.init = true;
