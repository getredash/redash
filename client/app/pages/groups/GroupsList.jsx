import React from 'react';
import { react2angular } from 'react2angular';

import Button from 'antd/lib/button';
import Modal from 'antd/lib/modal';
import Tooltip from 'antd/lib/tooltip';
import { Paginator } from '@/components/Paginator';
import CreateGroupDialog from '@/components/groups/CreateGroupDialog';

import { wrap as liveItemsList, ControllerType } from '@/components/items-list/ItemsList';
import { ResourceItemsSource } from '@/components/items-list/classes/ItemsSource';
import { StateStorage } from '@/components/items-list/classes/StateStorage';

import LoadingState from '@/components/items-list/components/LoadingState';
import EmptyState from '@/components/items-list/components/EmptyState';
import ItemsTable, { Columns } from '@/components/items-list/components/ItemsTable';

import { Group } from '@/services/group';
import settingsMenu from '@/services/settingsMenu';
import { toastr } from '@/services/ng';
import { currentUser } from '@/services/auth';
import navigateTo from '@/services/navigateTo';
import { routesToAngularRoutes } from '@/lib/utils';

class GroupsList extends React.Component {
  static propTypes = {
    controller: ControllerType.isRequired,
  };

  listColumns = [
    Columns.custom((text, group) => (
      <div>
        <a href={'groups/' + group.id}>{group.name}</a>
        {(group.type === 'builtin') && <span className="label label-default m-l-10">built-in</span>}
      </div>
    ), {
      field: 'name',
      width: null,
    }),
    Columns.custom((text, group) => (
      <Button.Group>
        <Button href={`groups/${group.id}`} onClick={e => e.stopPropagation()}>Members</Button>
        <Button href={`groups/${group.id}/data_sources`} onClick={e => e.stopPropagation()}>Datasources</Button>
      </Button.Group>
    ), {
      width: '1%',
      className: 'text-nowrap',
    }),
    Columns.custom((text, group) => {
      const canRemove = group.type !== 'builtin';
      const button = (
        <Button
          className="w-100"
          type="danger"
          disabled={!canRemove}
          onClick={event => this.deleteGroup(event, group)}
        >
          Delete
        </Button>
      );
      return canRemove ? button : (
        <Tooltip placement="top" title="Cannot delete built-in group" mouseLeaveDelay={0}>{button}</Tooltip>
      );
    }, {
      width: '1%',
      className: 'text-nowrap p-l-0',
      isAvailable: () => currentUser.isAdmin,
    }),
  ];

  createGroup = () => {
    CreateGroupDialog.showModal({
      group: new Group(),
    }).result.then((group) => {
      group.$save().then(newGroup => navigateTo(`/groups/${newGroup.id}`));
    });
  };

  deleteGroup = (event, group) => {
    // prevent default click action on table rows
    event.preventDefault();
    event.stopPropagation();

    Modal.confirm({
      title: 'Delete Group',
      content: 'Are you sure you want to delete this group?',
      okText: 'Yes',
      okType: 'danger',
      cancelText: 'No',
      onOk: () => {
        group.$delete(() => {
          toastr.success('Group deleted successfully.');
          this.props.controller.update();
        });
      },
    });
  };

  onTableRowClick = (event, item) => navigateTo('groups/' + item.id);

  render() {
    const { controller } = this.props;

    return (
      <React.Fragment>
        {currentUser.isAdmin && (
          <div className="m-b-15">
            <Button type="primary" onClick={this.createGroup}>
              <i className="fa fa-plus m-r-5" />
              New Group
            </Button>
          </div>
        )}

        {!controller.isLoaded && <LoadingState className="" />}
        {controller.isLoaded && controller.isEmpty && <EmptyState className="" />}
        {
          controller.isLoaded && !controller.isEmpty && (
            <div className="table-responsive">
              <ItemsTable
                items={controller.pageItems}
                columns={this.listColumns}
                showHeader={false}
                onRowClick={this.onTableRowClick}
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
      </React.Fragment>
    );
  }
}

export default function init(ngModule) {
  settingsMenu.add({
    permission: 'list_users',
    title: 'Groups',
    path: 'groups',
    order: 3,
  });

  ngModule.component('pageGroupsList', react2angular(liveItemsList(
    GroupsList,
    new ResourceItemsSource({
      isPlainList: true,
      getRequest() {
        return {};
      },
      getResource() {
        return Group.query.bind(Group);
      },
      getItemProcessor() {
        return (item => new Group(item));
      },
    }),
    new StateStorage({ orderByField: 'name', itemsPerPage: 10 }),
  )));

  return routesToAngularRoutes([
    {
      path: '/groups',
      title: 'Groups',
      key: 'groups',
    },
  ], {
    reloadOnSearch: false,
    template: '<settings-screen><page-groups-list on-error="handleError"></page-groups-list></settings-screen>',
    controller($scope, $exceptionHandler) {
      'ngInject';

      $scope.handleError = $exceptionHandler;
    },
  });
}

init.init = true;
