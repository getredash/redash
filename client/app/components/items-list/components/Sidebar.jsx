import React from 'react';
import PropTypes from 'prop-types';
import SearchInput from './SearchInput';
import SidebarMenu from './SidebarMenu';
import SidebarTags from './SidebarTags';
import PageSizeSelect from './PageSizeSelect';

export default function Sidebar({ menuItems, selectedItem, searchPlaceholder, tagsUrl }) {
  return (
    <React.Fragment>
      <SearchInput placeholder={searchPlaceholder} />
      <SidebarMenu items={menuItems} selected={selectedItem} />
      <SidebarTags url={tagsUrl} />
      <PageSizeSelect />
    </React.Fragment>
  );
}

Sidebar.propTypes = {
  menuItems: PropTypes.array, // eslint-disable-line react/forbid-prop-types
  selectedItem: PropTypes.string,
  searchPlaceholder: PropTypes.string,
  tagsUrl: PropTypes.string,
};

Sidebar.defaultProps = {
  menuItems: [],
  selectedItem: PropTypes.string,
  searchPlaceholder: 'Search...',
  tagsUrl: '',
};
