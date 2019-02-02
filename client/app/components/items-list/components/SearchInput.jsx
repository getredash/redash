import React from 'react';
import PropTypes from 'prop-types';
import Input from 'antd/lib/input';
import ItemsListContext from '../ItemsListContext';

export default class SearchInput extends React.Component {
  static propTypes = {
    placeholder: PropTypes.string,
  };

  static defaultProps = {
    placeholder: 'Search...',
  };

  static contextType = ItemsListContext;

  render() {
    return (
      <div className="m-b-10">
        <Input
          className="form-control"
          placeholder={this.props.placeholder}
          defaultValue={this.context.searchTerm}
          onChange={event => this.context.updateSearch(event.target.value)}
          autoFocus
        />
      </div>
    );
  }
}
