import Card from 'antd/lib/card';
import Input from 'antd/lib/input';
import List from 'antd/lib/list';
import { includes, isEmpty } from 'lodash';
import PropTypes from 'prop-types';
import React from 'react';
import { Type } from './proptypes';

const { Search } = Input;
const { Meta } = Card;

export default class TypePicker extends React.Component {
  static propTypes = {
    title: PropTypes.string,
    types: PropTypes.arrayOf(Type),
  };

  static defaultProps = {
    title: null,
    types: [],
  };

  constructor(props) {
    super(props);
    this.state = { searchText: '' };
  }

  // eslint-disable-next-line class-methods-use-this
  renderListItem(item) {
    return (
      <List.Item>
        <Card
          bodyStyle={{ minHeight: '80px' }}
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
          <Meta description={item.name} />
        </Card>
      </List.Item>
    );
  }

  render() {
    const { title, types } = this.props;
    const { searchText } = this.state;

    const filteredTypes = types.filter(type => isEmpty(searchText) ||
      includes(type.name.toLowerCase(), searchText.toLowerCase()));

    return (
      <div className="text-center" data-test="TypePicker">
        {title && <h3>{title}</h3>}
        <Search
          className="m-b-20"
          placeholder="Search..."
          onChange={e => this.setState({ searchText: e.target.value })}
          style={{ maxWidth: 300 }}
          autoFocus
        />
        <List
          className="p-20"
          grid={{ gutter: 12, xs: 1, sm: 3, lg: 4, xl: 6 }}
          dataSource={filteredTypes}
          renderItem={item => this.renderListItem(item)}
        />
      </div>
    );
  }
}
