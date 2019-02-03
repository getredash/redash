import { isFunction, isString, defaultTo, filter, map } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import Input from 'antd/lib/input';
import Select from 'antd/lib/select';

import { TagsList } from '@/components/TagsList';

import { clientConfig } from '@/services/auth';

import ItemsListContext from '../ItemsListContext';

export default class Sidebar extends React.Component {
  static propTypes = {
    searchPlaceholder: PropTypes.string,
    menuItems: PropTypes.arrayOf(PropTypes.shape({
      key: PropTypes.string.isRequired,
      href: PropTypes.string.isRequired,
      // string: CSS class to use as icon (with `<i> tag)
      // function: return value will be used as icon
      icon: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
      title: PropTypes.string.isRequired,
      // boolean: `true` to show item, `false` to hide
      // function: should return boolean
      // if omitted: show item
      isAvailable: PropTypes.oneOfType([PropTypes.bool, PropTypes.func]),
    })),
    selectedItem: PropTypes.string,
    tagsUrl: PropTypes.string,
    pageSizeOptions: PropTypes.arrayOf(PropTypes.number),
  };

  static defaultProps = {
    searchPlaceholder: 'Search...',
    menuItems: [],
    selectedItem: PropTypes.string,
    tagsUrl: '',
    pageSizeOptions: null, // defaults to `clientConfig.pageSizeOptions`, but it's not available on this stage
  };

  static contextType = ItemsListContext;

  renderSearchInput() {
    return (
      <div className="m-b-10">
        <Input
          className="form-control"
          placeholder={this.props.searchPlaceholder}
          defaultValue={this.context.searchTerm}
          onChange={event => this.context.updateSearch(event.target.value)}
          autoFocus
        />
      </div>
    );
  }

  renderMenu() {
    const items = filter(
      this.props.menuItems,
      item => (isFunction(item.isAvailable) ? item.isAvailable() : defaultTo(item.isAvailable, true)),
    );
    if (items.length === 0) {
      return null;
    }
    return (
      <div className="list-group m-b-10 tags-list tiled">
        {map(items, item => (
          <a
            key={item.key}
            href={item.href}
            className={classNames('list-group-item', { active: this.props.selectedItem === item.key })}
          >
            {
              isString(item.icon) && (item.icon !== '') &&
              <span className="btn-favourite m-r-5"><i className={item.icon} aria-hidden="true" /></span>
            }
            {isFunction(item.icon) && (item.icon(item) || null)}
            {item.title}
          </a>
        ))}
      </div>
    );
  }

  renderTags() {
    if (this.props.tagsUrl === '') {
      return null;
    }
    return (
      <div className="m-b-10">
        <TagsList tagsUrl={this.props.tagsUrl} onUpdate={tags => this.context.updateSelectedTags(tags)} />
      </div>
    );
  }

  renderPageSizeSelect() {
    const items = this.props.pageSizeOptions || clientConfig.pageSizeOptions;
    return (
      <div className="m-b-10">
        <div className="m-b-10">
          <Select
            className="w-100"
            defaultValue={this.context.itemsPerPage}
            onChange={pageSize => this.context.updatePaginator({ pageSize })}
          >
            {map(items, option => (
              <Select.Option key={option} value={option}>{ option } results</Select.Option>
            ))}
          </Select>
        </div>
      </div>
    );
  }

  render() {
    return (
      <React.Fragment>
        {this.renderSearchInput()}
        {this.renderMenu()}
        {this.renderTags()}
        {this.renderPageSizeSelect()}
      </React.Fragment>
    );
  }
}
