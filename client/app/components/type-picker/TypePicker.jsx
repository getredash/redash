import Card from 'antd/lib/card';
import Input from 'antd/lib/input';
import List from 'antd/lib/list';
import { includes, isEmpty } from 'lodash';
import PropTypes from 'prop-types';
import React from 'react';
import EmptyState from '@/components/items-list/components/EmptyState';
import { Type } from '../proptypes';

import './TypePicker.css';

const { Search } = Input;
const { Meta } = Card;

export default class TypePicker extends React.Component {
  static propTypes = {
    types: PropTypes.arrayOf(Type),
    hideSearch: PropTypes.bool,
  };

  static defaultProps = {
    types: [],
    hideSearch: false,
  };

  constructor(props) {
    super(props);
    this.state = { searchText: '' };
  }

  // eslint-disable-next-line class-methods-use-this
  renderListItem(item) {
    return (
      <List.Item className="type-picker__item">
        <Card
          size="small"
          cover={(<div><img alt={item.name} src={item.imgSrc} /></div>)}
          onClick={item.onClick}
          hoverable
        >
          <Meta title={(<h3>{item.name}</h3>)} />
        </Card>
      </List.Item>
    );
  }

  render() {
    const { types, hideSearch } = this.props;
    const { searchText } = this.state;

    const filteredTypes = types.filter(type => isEmpty(searchText) ||
      includes(type.name.toLowerCase(), searchText.toLowerCase()));

    return (
      <div className="type-picker" data-test="TypePicker">
        {!hideSearch && (
          <div className="row p-10">
            <div className="col-md-4 col-md-offset-4">
              <Search
                placeholder="Search..."
                onChange={e => this.setState({ searchText: e.target.value })}
                autoFocus
              />
            </div>
          </div>
        )}
        {isEmpty(filteredTypes) ? (<EmptyState className="" />) : (
          <List
            className="p-10"
            grid={{ gutter: 12, column: 6, xs: 1, sm: 3, lg: 4, xl: 6 }}
            dataSource={filteredTypes}
            renderItem={item => this.renderListItem(item)}
          />
        )}
      </div>
    );
  }
}
