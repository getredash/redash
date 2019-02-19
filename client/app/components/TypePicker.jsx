import Card from 'antd/lib/card';
import Input from 'antd/lib/input';
import List from 'antd/lib/list';
import { includes, isEmpty } from 'lodash';
import PropTypes from 'prop-types';
import React from 'react';
import { react2angular } from 'react2angular';
import { Type } from './proptypes';

const { Search } = Input;
const { Meta } = Card;

export class TypePicker extends React.Component {
  static propTypes = {
    title: PropTypes.string.isRequired,
    types: PropTypes.arrayOf(Type),
    onSelect: PropTypes.func,
  };

  static defaultProps = {
    types: [],
    onSelect: () => {},
  };

  constructor(props) {
    super(props);
    this.state = { searchText: '' };
  }

  renderListItem(item) {
    const { onSelect } = this.props;

    return (
      <List.Item>
        <Card
          headStyle={{ textAlign: 'center' }}
          bodyStyle={{ minHeight: '80px' }}
          cover={(
            <img
              alt={item.name}
              style={{ margin: 'auto', width: '64px', height: '64px' }}
              src={item.imgSrc}
            />
          )}
          onClick={() => onSelect(item.type)}
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
      <div className="text-center">
        <h3>{title}</h3>
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

export default function init(ngModule) {
  ngModule.component('typePicker', react2angular((props) => {
    const {
      title,
      types,
      imgRoot,
      onTypeSelect,
    } = props;

    const typePickerProps = {
      title,
      types: types.map(type => ({
        ...type,
        imgSrc: `${imgRoot}/${type.type}.png`,
      })),
      onSelect: onTypeSelect,
    };

    return (<TypePicker {...typePickerProps} />);
  }, ['title', 'types', 'imgRoot', 'onTypeSelect']));
}

init.init = true;
