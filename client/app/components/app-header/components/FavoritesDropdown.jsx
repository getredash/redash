import React, { useState, useMemo, useCallback, useEffect } from "react";
import PropTypes from "prop-types";
import { isEmpty, template } from "lodash";

import Dropdown from "antd/lib/dropdown";
import Icon from "antd/lib/icon";
import Menu from "antd/lib/menu";

import HelpTrigger from "@/components/HelpTrigger";

export default function FavoritesDropdown({ fetch, urlTemplate }) {
  const [items, setItems] = useState();
  const [loading, setLoading] = useState(false);

  const noItems = isEmpty(items);
  const urlCompiled = useMemo(() => template(urlTemplate), [urlTemplate]);

  const fetchItems = useCallback(
    (showLoadingState = true) => {
      setLoading(showLoadingState);
      fetch()
        .$promise.then(({ results }) => {
          setItems(results);
        })
        .finally(() => {
          setLoading(false);
        });
    },
    [fetch]
  );

  // fetch items on init
  useEffect(() => {
    fetchItems(false);
  }, [fetchItems]);

  // fetch items on click
  const onVisibleChange = visible => visible && fetchItems();

  const menu = (
    <Menu className="favorites-dropdown">
      {noItems ? (
        <Menu.Item>
          <span className="btn-favourite m-r-5">
            <i className="fa fa-star" />
          </span>
          No favorites selected yet <HelpTrigger type="FAVORITES" />
        </Menu.Item>
      ) : (
        items.map(item => (
          <Menu.Item key={item.id}>
            <a href={urlCompiled(item)}>
              <span className="btn-favourite m-r-5">
                <i className="fa fa-star" />
              </span>
              {item.name}
            </a>
          </Menu.Item>
        ))
      )}
    </Menu>
  );

  return (
    <Dropdown
      disabled={loading}
      trigger={["click"]}
      placement="bottomLeft"
      onVisibleChange={onVisibleChange}
      overlay={menu}>
      {loading ? <Icon type="loading" spin /> : <Icon type="down" />}
    </Dropdown>
  );
}

FavoritesDropdown.propTypes = {
  fetch: PropTypes.func.isRequired,
  urlTemplate: PropTypes.string.isRequired,
};
