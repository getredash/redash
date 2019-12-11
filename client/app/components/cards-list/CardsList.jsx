import Input from "antd/lib/input";
import { includes, isEmpty } from "lodash";
import PropTypes from "prop-types";
import React from "react";
import EmptyState from "@/components/items-list/components/EmptyState";

import "./CardsList.less";

const { Search } = Input;

export default class CardsList extends React.Component {
  static propTypes = {
    items: PropTypes.arrayOf(
      PropTypes.shape({
        title: PropTypes.string.isRequired,
        imgSrc: PropTypes.string.isRequired,
        onClick: PropTypes.func,
        href: PropTypes.string,
      })
    ),
    showSearch: PropTypes.bool,
  };

  static defaultProps = {
    items: [],
    showSearch: false,
  };

  state = {
    searchText: "",
  };

  constructor(props) {
    super(props);
    this.items = [];

    let itemId = 1;
    props.items.forEach(item => {
      this.items.push({ id: itemId, ...item });
      itemId += 1;
    });
  }

  // eslint-disable-next-line class-methods-use-this
  renderListItem(item) {
    return (
      <a key={`card${item.id}`} className="visual-card" onClick={item.onClick} href={item.href}>
        <img alt={item.title} src={item.imgSrc} />
        <h3>{item.title}</h3>
      </a>
    );
  }

  render() {
    const { showSearch } = this.props;
    const { searchText } = this.state;

    const filteredItems = this.items.filter(
      item => isEmpty(searchText) || includes(item.title.toLowerCase(), searchText.toLowerCase())
    );

    return (
      <div data-test="CardsList">
        {showSearch && (
          <div className="row p-10">
            <div className="col-md-4 col-md-offset-4">
              <Search placeholder="Search..." onChange={e => this.setState({ searchText: e.target.value })} autoFocus />
            </div>
          </div>
        )}
        {isEmpty(filteredItems) ? (
          <EmptyState className="" />
        ) : (
          <div className="row">
            <div className="col-lg-12 d-inline-flex flex-wrap visual-card-list">
              {filteredItems.map(item => this.renderListItem(item))}
            </div>
          </div>
        )}
      </div>
    );
  }
}
