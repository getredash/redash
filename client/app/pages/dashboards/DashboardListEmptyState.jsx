import React from 'react';
import PropTypes from 'prop-types';
import { BigMessage } from '@/components/BigMessage';
import { NoTaggedObjectsFound } from '@/components/NoTaggedObjectsFound';
import { EmptyState } from '@/components/empty-state/EmptyState';

import ItemsListContext from '@/components/items-list/ItemsListContext';

export default class DashboardListEmptyState extends React.Component {
  static propTypes = {
    page: PropTypes.string.isRequired,
  };

  static contextType = ItemsListContext;

  render() {
    if (this.context.searchTerm !== '') {
      return (
        <BigMessage message="Sorry, we couldn't find anything." icon="fa-search" />
      );
    }
    if (this.context.selectedTags.length > 0) {
      return (
        <NoTaggedObjectsFound objectType="dashboards" tags={this.context.selectedTags} />
      );
    }
    switch (this.props.page) {
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
}
