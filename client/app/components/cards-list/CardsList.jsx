import Card from 'antd/lib/card';
import Input from 'antd/lib/input';
import List from 'antd/lib/list';
import { includes, isEmpty } from 'lodash';
import PropTypes from 'prop-types';
import React from 'react';
import EmptyState from '@/components/items-list/components/EmptyState';

import './CardsList.less';

const { Search } = Input;
const { Meta } = Card;

export default class CardsList extends React.Component {
  static propTypes = {
    items: PropTypes.arrayOf(
      PropTypes.shape({
        title: PropTypes.string.isRequired,
        imgSrc: PropTypes.string.isRequired,
        onClick: PropTypes.func,
        href: PropTypes.string,
      }),
    ),
    showSearch: PropTypes.bool,
  };

  static defaultProps = {
    items: [],
    showSearch: false,
  };

  state = {
    searchText: '',
  };

  // eslint-disable-next-line class-methods-use-this
  renderListItem(item) {
    const card = (
      <Card
        size="small"
        cover={(<div><img alt={item.title} src={item.imgSrc} /></div>)}
        onClick={item.onClick}
        hoverable
      >
        <Meta title={(<h3>{item.title}</h3>)} />
      </Card>
    );
    return (
      <List.Item className="cards-list-item">
        {item.href ? (<a href={item.href}>{card}</a>) : card}
      </List.Item>
    );
  }

  render() {
    const { items, showSearch } = this.props;
    const { searchText } = this.state;

    const filteredItems = items.filter(item => isEmpty(searchText) ||
      includes(item.title.toLowerCase(), searchText.toLowerCase()));

    return (
      <div className="cards-list" data-test="CardsList">
        {showSearch && (
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
        {isEmpty(filteredItems) ? (<EmptyState className="" />) : (
          <List
            className="p-10"
            grid={{ gutter: 12, column: 6, xs: 1, sm: 3, lg: 4, xl: 6 }}
            dataSource={filteredItems}
            renderItem={item => this.renderListItem(item)}
          />
        )}
      </div>
    );
  }
}
