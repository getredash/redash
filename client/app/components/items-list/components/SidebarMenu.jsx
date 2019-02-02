import { isFunction, isString, defaultTo, map, filter } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export default function SidebarMenu({ items, selected }) {
  items = filter(
    items,
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
          className={classNames('list-group-item', { active: selected === item.key })}
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

SidebarMenu.propTypes = {
  items: PropTypes.arrayOf(PropTypes.shape({
    key: PropTypes.string.isRequired,
    href: PropTypes.string.isRequired,
    icon: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
    title: PropTypes.string.isRequired,
    isAvailable: PropTypes.oneOfType([PropTypes.bool, PropTypes.func]),
  })),
  selected: PropTypes.string,
};

SidebarMenu.defaultProps = {
  items: [],
  selected: null,
};
