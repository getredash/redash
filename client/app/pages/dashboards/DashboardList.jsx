import { extend, map } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import { react2angular } from 'react2angular';

import { PageHeader } from '@/components/PageHeader';
import { FavoritesControl } from '@/components/FavoritesControl';
import { DashboardTagsControl } from '@/components/tags-control/DashboardTagsControl';

import ItemsListContext from '@/components/items-list/ItemsListContext';

import LiveItemsList from '@/components/items-list/LiveItemsList';
import LoadingState from '@/components/items-list/components/LoadingState';
import Sidebar from '@/components/items-list/components/Sidebar';
import ItemsTable from '@/components/items-list/components/ItemsTable';

import { Dashboard } from '@/services/dashboard';
import navigateTo from '@/services/navigateTo';
import { formatDateTime } from '@/filters/datetime';

import DashboardListEmptyState from './DashboardListEmptyState';

import './dashboard-list.css';

class DashboardList extends React.Component {
  static propTypes = {
    currentPage: PropTypes.string.isRequired,
  };

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
    const resource = resources[this.props.currentPage];
    this.doRequest = request => resource(request).$promise
      .then(({ results, count }) => ({
        count,
        results: map(results, item => new Dashboard(item)),
      }));

    this.onTableRowClick = (event, item) => navigateTo('dashboard/' + item.slug);
  }

  render() {
    const sidebar = (
      <Sidebar
        searchPlaceholder="Search Dashboards..."
        menuItems={this.constructor.sidebarMenu}
        selectedItem={this.props.currentPage}
        tagsUrl="api/dashboards/tags"
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
                      <DashboardListEmptyState page={this.props.currentPage} />
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
