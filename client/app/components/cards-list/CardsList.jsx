import { includes, isEmpty } from "lodash";
import PropTypes from "prop-types";
import React from "react";
import Search from "antd/lib/input";
import Link from "@/components/Link";
import EmptyState from "@/components/items-list/components/EmptyState";

import "./CardsList.less";

export interface CardsListItem {
  title: string;
  imgSrc: string;
  onClick?: () => void;
  href?: string;
}

export interface CardsListProps {
  items?: CardsListItem[];
  showSearch?: boolean;
}

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

  state = {
    searchText: "",
  };

  items: CardsListItem[];
  showSearch: boolean;

  constructor(props: CardsListProps) {
    super(props);
    this.items = props.items ?? [];
    this.showSearch = props.showSearch ?? false;
  }

  renderListItem(item: CardsListItem, keySuffix: string) {
    return (
      <Link key={`card${keySuffix}`} className="visual-card" onClick={item.onClick} href={item.href}>
        <img alt={item.title} src={item.imgSrc} />
        <h3>{item.title}</h3>
      </Link>
    );
  }

  render() {
    const { searchText } = this.state;

    const filteredItems = this.items.filter(
      item => isEmpty(searchText) || includes(item.title.toLowerCase(), searchText.toLowerCase())
    );

    return (
      <div data-test="CardsList">
        {this.showSearch && (
          <div className="row p-10">
            <div className="col-md-4 col-md-offset-4">
              <Search placeholder="Search..." onChange={(e: React.ChangeEvent<HTMLInputElement>) => this.setState({ searchText: e.target.value })} autoFocus />
            </div>
          </div>
        )}
        {isEmpty(filteredItems) ? (
          <EmptyState className="" />
        ) : (
          <div className="row">
            <div className="col-lg-12 d-inline-flex flex-wrap visual-card-list">
              {filteredItems.map((item, index) => this.renderListItem(item, index.toString()))}
            </div>
          </div>
        )}
      </div>
    );
  }
}
