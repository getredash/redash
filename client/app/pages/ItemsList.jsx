import { isString, isFunction, bind, map, extend, omit } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import Table from 'antd/lib/table';
import Input from 'antd/lib/input';
import Select from 'antd/lib/select';
import { Paginator } from '@/components/Paginator';
import { BigMessage } from '@/components/BigMessage';
import { PageHeader } from '@/components/PageHeader';
import { TagsList } from '@/components/TagsList';
import { LivePaginator } from '@/lib/pagination';
import { $location, $route } from '@/services/ng';
import { clientConfig } from '@/services/auth';

export default class ItemsList extends React.Component {
  static sidebarMenu = [];

  static listColumns = [];

  static orderSeparator = '-';

  static defaultOrder = '-created_at';

  static propTypes = {
    currentPage: PropTypes.string.isRequired,
  };

  constructor(props) {
    super(props);

    const urlQueryParams = $location.search();

    const searchTerm = urlQueryParams.q || '';

    const orderSeparator = this.constructor.orderSeparator;
    let pageOrder = urlQueryParams.order || this.constructor.defaultOrder;
    const pageOrderReverse = pageOrder.startsWith(orderSeparator);
    if (pageOrderReverse) {
      pageOrder = pageOrder.substr(1);
    }

    this.state = {
      isLoaded: false,
      isEmpty: false,

      searchTerm,
      selectedTags: [],

      pageSizeOptions: clientConfig.pageSizeOptions,

      paginator: new LivePaginator(() => {}, {
        page: parseInt(urlQueryParams.page, 10) || 1,
        itemsPerPage: parseInt(urlQueryParams.page_size, 10) || clientConfig.pageSize,
        orderByField: pageOrder,
        orderByReverse: pageOrderReverse,
      }),
    };
  }

  componentDidMount() {
    const requestCallback = bind(this.processResponse, this);

    this.state.paginator.rowsFetcher = (
      requestedPage,
      itemsPerPage,
      orderByField,
      orderByReverse,
      paginator,
      requested = false,
    ) => {
      // in search mode ignore the ordering and use the ranking order
      // provided by the server-side FTS backend instead, unless it was
      // requested by the user by actively ordering in search mode
      if (this.isInSearchMode && !requested) {
        orderByField = undefined;
      }
      if (orderByField && orderByReverse) {
        orderByField = this.constructor.orderSeparator + orderByField;
      }

      $location.search({
        page: requestedPage,
        page_size: itemsPerPage,
        order: orderByField,
        q: this.state.searchTerm !== '' ? this.state.searchTerm : null,
      });

      this.setState({ isLoaded: false });
      const request = this.getRequest(requestedPage, itemsPerPage, orderByField);
      return this.doRequest(request).then(requestCallback);
    };

    this.updatePaginator();
  }

  // eslint-disable-next-line class-methods-use-this, no-unused-vars
  onRowClick(event, item) {
  }

  get isInSearchMode() {
    return isString(this.state.searchTerm) && (this.state.searchTerm !== '');
  }

  getSidebarMenu() {
    return this.constructor.sidebarMenu;
  }

  getListColumns() {
    return this.constructor.listColumns;
  }

  getRequest(requestedPage, itemsPerPage, orderByField) {
    const request = {
      page: requestedPage,
      page_size: itemsPerPage,
      order: orderByField,
      tags: this.state.selectedTags,
    };
    if (this.isInSearchMode) {
      request.q = this.state.searchTerm;
    }
    return request;
  }

  toggleSorting(field) {
    this.state.paginator.orderBy(field);
  }

  // eslint-disable-next-line no-unused-vars, class-methods-use-this
  doRequest(request) {
    return null;
  }

  processResponse() {
    this.setState({ isLoaded: true });
  }

  update(state) {
    this.setState(state, () => {
      this.updatePaginator();
    });
  }

  updatePaginator(updates) {
    const paginator = this.state.paginator;
    updates = extend({ page: paginator.page }, updates);
    paginator.setPage(
      updates.page,
      updates.pageSize,
      updates.pageOrder,
      updates.pageOrderReverse,
    );
    // this.forceUpdate();
  }

  // eslint-disable-next-line class-methods-use-this
  renderPageHeader() {
    return (
      <PageHeader title={$route.current.title} />
    );
  }

  // eslint-disable-next-line class-methods-use-this
  renderLoadingState() {
    return (
      <div className="text-center">
        <BigMessage icon="fa-spinner fa-2x fa-pulse" message="Loading..." />
      </div>
    );
  }

  // eslint-disable-next-line class-methods-use-this
  renderEmptyState() {
    return (
      <div className="text-center">
        <BigMessage icon="fa-search" message="Sorry, we couldn't find anything." />
      </div>
    );
  }

  renderSearchInput(placeholder = null) {
    return (
      <div className="m-b-10">
        <Input
          className="form-control"
          placeholder={placeholder}
          defaultValue={this.state.searchTerm}
          onChange={event => this.update({ searchTerm: event.target.value })}
          autoFocus
        />
      </div>
    );
  }

  renderSidebarMenu() {
    const sidebarMenu = this.getSidebarMenu();
    if (sidebarMenu.length > 0) {
      return (
        <div className="list-group m-b-10 tags-list tiled">
          {map(sidebarMenu, item => (
            <a
              key={item.key}
              href={item.href}
              className={'list-group-item ' + (this.props.currentPage === item.key ? 'active' : '')}
            >
              {isString(item.icon) && <span className="btn-favourite m-r-5"><i className={item.icon} aria-hidden="true" /></span>}
              {isFunction(item.icon) && (item.icon(item) || null)}
              {item.title}
            </a>
          ))}
        </div>
      );
    }
    return null;
  }

  renderTagsList(tagsUrl = null) {
    if (isString(tagsUrl) && (tagsUrl !== '')) {
      return (
        <div className="m-b-10">
          <TagsList tagsUrl={tagsUrl} onUpdate={selectedTags => this.update({ selectedTags })} />
        </div>
      );
    }
    return null;
  }

  renderPageSizeSelect() {
    return (
      <div className="m-b-10">
        <Select
          className="w-100"
          defaultValue={this.state.paginator.itemsPerPage}
          onChange={pageSize => this.updatePaginator({ pageSize })}
        >
          {map(this.state.pageSizeOptions, option => (
            <Select.Option key={option} value={option}>{ option } results</Select.Option>
          ))}
        </Select>
      </div>
    );
  }

  renderSidebar() {
    return (
      <React.Fragment>
        {this.renderSearchInput()}
        {this.renderSidebarMenu()}
        {this.renderTagsList()}
        {this.renderPageSizeSelect()}
      </React.Fragment>
    );
  }

  renderList() {
    const { paginator } = this.state;
    const orderByField = paginator.orderByField;
    const orderByDirection = paginator.orderByReverse ? 'descend' : 'ascend';

    const columns = map(
      map(
        this.getListColumns(),
        column => extend(column, { orderByField: column.orderByField || column.field }),
      ),
      (column, index) => extend(omit(column, ['field', 'orderByField', 'render']), {
        key: 'column' + index,
        dataIndex: 'item[' + JSON.stringify(column.field) + ']',
        defaultSortOrder: column.orderByField === orderByField ? orderByDirection : null,
        onHeaderCell: () => ({
          onClick: () => this.toggleSorting(column.orderByField),
        }),
        render: (text, row) => (isFunction(column.render) ? column.render(text, row.item, this) : text),
      }),
    );
    const rows = map(
      this.state.paginator.getPageRows(),
      (item, index) => ({ key: 'row' + index, item }),
    );
    return (
      <div className="bg-white tiled">
        <Table
          className="table-data"
          columns={columns}
          dataSource={rows}
          rowKey={row => row.key}
          pagination={false}
          onRow={row => ({
            onClick: (event) => { this.onRowClick(event, row.item); },
          })}
        />
        <Paginator
          totalCount={this.state.paginator.totalCount}
          itemsPerPage={this.state.paginator.itemsPerPage}
          page={this.state.paginator.page}
          onChange={page => this.updatePaginator({ page })}
        />
      </div>
    );
  }

  render() {
    const { isEmpty, isLoaded } = this.state;

    const sidebar = this.renderSidebar();
    const loader = !isLoaded ? this.renderLoadingState() : null;
    const emptyMessage = isLoaded && isEmpty ? this.renderEmptyState() : null;
    const list = isLoaded && !isEmpty ? this.renderList() : null;

    return (
      <React.Fragment>
        {this.renderPageHeader()}
        <div className="row">
          {sidebar && <div className="col-md-3 list-control-t">{sidebar}</div>}
          <div className={classNames('list-content', { 'col-md-9': sidebar, 'col-md-12': !sidebar })}>
            {loader}
            {list}
            {emptyMessage}
          </div>
          {sidebar && <div className="col-md-3 list-control-r-b">{sidebar}</div>}
        </div>
      </React.Fragment>
    );
  }
}
