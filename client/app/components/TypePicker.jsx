import Card from 'antd/lib/card';
import Input from 'antd/lib/input';
import List from 'antd/lib/list';
import { includes, isEmpty } from 'lodash';
import PropTypes from 'prop-types';
import React from 'react';
import EmptyState from '@/components/items-list/components/EmptyState';
import { Type } from './proptypes';

const { Search } = Input;
const { Meta } = Card;

export default class TypePicker extends React.Component {
  static propTypes = {
    types: PropTypes.arrayOf(Type),
  };

  static defaultProps = {
    types: [],
  };

  constructor(props) {
    super(props);
    this.state = { searchText: '' };
  }

  // eslint-disable-next-line class-methods-use-this
  renderListItem(item) {
    const titleStyle = {
      fontSize: '13px',
      maxHeight: '50px',
      whiteSpace: 'normal',
      textOverflow: 'ellipsis',
    };

    return (
      <List.Item>
        <Card
          bodyStyle={{ height: '80px', padding: '15px' }}
          cover={(
            <div className="m-t-10">
              <img
                alt={item.name}
                style={{ margin: 'auto', width: '64px', height: '64px' }}
                src={item.imgSrc}
              />
            </div>
          )}
          onClick={item.onClick}
          hoverable
        >
          <Meta title={(<p style={titleStyle}>{item.name}</p>)} />
        </Card>
      </List.Item>
    );
  }

  render() {
    const { types } = this.props;
    const { searchText } = this.state;

    const filteredTypes = types.filter(type => isEmpty(searchText) ||
      includes(type.name.toLowerCase(), searchText.toLowerCase()));

    return (
      <div className="text-center" data-test="TypePicker">
        <div className="row p-10">
          <div className="col-md-4 col-md-offset-4">
            <Search
              placeholder="Search..."
              onChange={e => this.setState({ searchText: e.target.value })}
              autoFocus
            />
          </div>
        </div>
        {isEmpty(filteredTypes) ? (<EmptyState className="" />) : (
          <List
            className="p-10"
            grid={{ gutter: 12, xs: 1, sm: 3, lg: 4, xl: 6 }}
            dataSource={filteredTypes}
            renderItem={item => this.renderListItem(item)}
          />
        )}
      </div>
    );
  }
}
