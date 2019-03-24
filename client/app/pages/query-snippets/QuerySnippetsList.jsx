import React from 'react';
import { react2angular } from 'react2angular';

import Button from 'antd/lib/button';
import { Paginator } from '@/components/Paginator';

import { wrap as liveItemsList, ControllerType } from '@/components/items-list/ItemsList';
import { ResourceItemsSource } from '@/components/items-list/classes/ItemsSource';
import { StateStorage } from '@/components/items-list/classes/StateStorage';

import LoadingState from '@/components/items-list/components/LoadingState';
import ItemsTable, { Columns } from '@/components/items-list/components/ItemsTable';

import { QuerySnippet } from '@/services/query-snippet';
import settingsMenu from '@/services/settingsMenu';
import { policy } from '@/services/policy';
import { routesToAngularRoutes } from '@/lib/utils';
import './QuerySnippetsList.less';

class QuerySnippetsList extends React.Component {
  static propTypes = {
    controller: ControllerType.isRequired,
  };

  listColumns = [
    Columns.custom.sortable((text, querySnippet) => (
      <div>
        <a className="table-main-title" href={'query_snippets/' + querySnippet.id}>{querySnippet.trigger}</a>
      </div>
    ), {
      title: 'Trigger',
      field: 'trigger',
      className: 'text-nowrap',
    }),
    Columns.custom.sortable(text => text, {
      title: 'Description',
      field: 'description',
      className: 'text-nowrap',
    }),
    Columns.custom(snippet => (
      <code className="snippet-content">
        {snippet}
      </code>
    ), {
      title: 'Snippet',
      field: 'snippet',
    }),
    Columns.avatar({ field: 'user', className: 'p-l-0 p-r-0' }, name => `Created by ${name}`),
    Columns.date.sortable({
      title: 'Created At',
      field: 'created_at',
      className: 'text-nowrap',
      width: '1%',
    }),
  ];

  render() {
    const { controller } = this.props;

    return (
      <div>
        <div className="m-b-15">
          <Button type="primary" href="/query_snippets/new" disabled={!policy.isCreateQuerySnippetEnabled()}>
            <i className="fa fa-plus m-r-5" />
            New Query Snippet
          </Button>
        </div>

        {!controller.isLoaded && <LoadingState className="" />}
        {controller.isLoaded && controller.isEmpty && (
          <div className="text-center">
          There are no query snippets yet.
            {policy.isCreateQuerySnippetEnabled() && (
              <div className="m-t-5">
                <a href="/query_snippets/new">Click here</a> to add one.
              </div>
            )}
          </div>
        )}
        {
          controller.isLoaded && !controller.isEmpty && (
            <div className="table-responsive">
              <ItemsTable
                items={controller.pageItems}
                columns={this.listColumns}
                context={this.actions}
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
    );
  }
}

export default function init(ngModule) {
  settingsMenu.add({
    permission: 'create_query',
    title: 'Query Snippets',
    path: 'query_snippets',
    order: 5,
  });

  ngModule.component('pageQuerySnippetsList', react2angular(liveItemsList(
    QuerySnippetsList,
    new ResourceItemsSource({
      isPlainList: true,
      getRequest() {
        return {};
      },
      getResource() {
        return QuerySnippet.query.bind(QuerySnippet);
      },
      getItemProcessor() {
        return (item => new QuerySnippet(item));
      },
    }),
    new StateStorage({ orderByField: 'trigger', itemsPerPage: 10 }),
  )));

  return routesToAngularRoutes([
    {
      path: '/query_snippets',
      title: 'Query Snippets',
      key: 'query_snippets',
    },
  ], {
    reloadOnSearch: false,
    template: '<settings-screen><page-query-snippets-list on-error="handleError"></page-query-snippets-list></settings-screen>',
    controller($scope, $exceptionHandler) {
      'ngInject';

      $scope.handleError = $exceptionHandler;
    },
  });
}

init.init = true;
