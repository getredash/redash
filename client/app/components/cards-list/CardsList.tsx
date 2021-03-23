import { includes, isEmpty } from "lodash";
import PropTypes from "prop-types";
import React, { useState } from "react";
import Input from "antd/lib/input";
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

interface ListItemProps {
  item: CardsListItem;
  keySuffix: string;
}

function ListItem({ item, keySuffix }: ListItemProps) {
  return (
    // @ts-expect-error TODO: refactor component
    <Link key={`card${keySuffix}`} className="visual-card" onClick={item.onClick} href={item.href}>
      <img alt={item.title} src={item.imgSrc} />
      <h3>{item.title}</h3>
    </Link>
  );
}

export default function CardsList({ items = [], showSearch = false }: CardsListProps) {
  const [searchText, setSearchText] = useState("");
  const filteredItems = items.filter(
    item => isEmpty(searchText) || includes(item.title.toLowerCase(), searchText.toLowerCase())
  );

  return (
    <div data-test="CardsList">
      {showSearch && (
        <div className="row p-10">
          <div className="col-md-4 col-md-offset-4">
            <Input.Search
              placeholder="Search..."
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value)}
              autoFocus
            />
          </div>
        </div>
      )}
      {isEmpty(filteredItems) ? (
        <EmptyState className="" />
      ) : (
        <div className="row">
          <div className="col-lg-12 d-inline-flex flex-wrap visual-card-list">
            {filteredItems.map((item: CardsListItem, index: number) => (
              <ListItem key={index} item={item} keySuffix={index.toString()} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

CardsList.propTypes = {
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
