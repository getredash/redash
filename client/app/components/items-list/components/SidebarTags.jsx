import React from 'react';
import PropTypes from 'prop-types';
import { TagsList } from '@/components/TagsList';
import ItemsListContext from '../ItemsListContext';

export default class SidebarTags extends React.Component {
  static propTypes = {
    url: PropTypes.string.isRequired,
  };

  static contextType = ItemsListContext;

  render() {
    if (this.props.url === '') {
      return null;
    }
    return (
      <div className="m-b-10">
        <TagsList tagsUrl={this.props.url} onUpdate={tags => this.context.updateSelectedTags(tags)} />
      </div>
    );
  }
}
