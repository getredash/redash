// NOTE: After upgrading to antd 4.x, use Ant Design icon components directly in your sidebar items definition.
// Example:
// import { DashboardOutlined, TableOutlined } from "@ant-design/icons";
// ...
// items: [
//   { key: "dashboards", href: "/dashboards", title: "Dashboards", icon: <DashboardOutlined /> },
//   { key: "queries", href: "/queries", title: "Queries", icon: <TableOutlined /> },
//   ...
// ]
// This ensures correct icon rendering and alignment in the sidebar.

import { isFunction, isString, filter} from "lodash";
import React, { useState, useCallback, useEffect } from "react";
import PropTypes from "prop-types";
import Input from "antd/lib/input";
import AntdMenu from "antd/lib/menu";
import Link from "@/components/Link";
import TagsList from "@/components/TagsList";

/*
    SearchInput
 */

export function SearchInput({ placeholder, value, showIcon, onChange, label }) {
  const [currentValue, setCurrentValue] = useState(value);

  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  const onInputChange = useCallback(
    event => {
      const newValue = event.target.value;
      setCurrentValue(newValue);
      onChange(newValue);
    },
    [onChange]
  );

  const InputControl = showIcon ? Input.Search : Input;
  return (
    <div className="m-b-10">
      <InputControl
        className="form-control"
        placeholder={placeholder}
        value={currentValue}
        aria-label={label}
        onChange={onInputChange}
      />
    </div>
  );
}

SearchInput.propTypes = {
  value: PropTypes.string.isRequired,
  placeholder: PropTypes.string,
  showIcon: PropTypes.bool,
  onChange: PropTypes.func.isRequired,
  label: PropTypes.string,
};

SearchInput.defaultProps = {
  placeholder: "Search...",
  showIcon: false,
  label: "Search",
};

/*
    Menu
 */

export function Menu({ items, selected }) {
  items = filter(items, item => (isFunction(item.isAvailable) ? item.isAvailable() : true));
  if (items.length === 0) {
    return null;
  }
  // Build menu items for AntdMenu
  const menuItems = items.map(item => ({
    key: item.key,
    className: "m-0",
    label: (
      <Link href={item.href}>
        <span className="sidebar-menu-item-content">
          {item.icon && (
            <span className="btn-favorite m-r-5 sidebar-menu-item-icon">
              {typeof item.icon === "function" ? item.icon(item) : item.icon}
            </span>
          )}
          <span className="sidebar-menu-item-title">{item.title}</span>
        </span>
      </Link>
    ),
  }));
  return (
    <div className="m-b-10 tags-list tiled">
      <AntdMenu
        className="invert-stripe-position"
        mode="inline"
        selectable={false}
        selectedKeys={[selected]}
        items={menuItems}
      />
    </div>
  );
}

Menu.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      href: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      icon: PropTypes.func, // function to render icon
      isAvailable: PropTypes.func, // return `true` to show item and `false` to hide; if omitted: show item
    })
  ),
  selected: PropTypes.string,
};

Menu.defaultProps = {
  items: [],
  selected: null,
};

/*
    MenuIcon
 */

export function MenuIcon({ icon }) {
  return (
    <span className="btn-favorite m-r-5">
      <i className={icon} aria-hidden="true" />
    </span>
  );
}

MenuIcon.propTypes = {
  icon: PropTypes.string.isRequired,
};

/*
    ProfileImage
 */

export function ProfileImage({ user }) {
  if (!isString(user.profile_image_url) || user.profile_image_url === "") {
    return null;
  }
  return <img src={user.profile_image_url} className="profile__image--sidebar m-r-5" width="13" alt={user.name} />;
}

ProfileImage.propTypes = {
  user: PropTypes.shape({
    profile_image_url: PropTypes.string,
    name: PropTypes.string,
  }).isRequired,
};

/*
    Tags
 */

export function Tags({ url, onChange, showUnselectAll }) {
  if (url === "") {
    return null;
  }
  return (
    <div className="m-b-10">
      <TagsList tagsUrl={url} onUpdate={onChange} showUnselectAll={showUnselectAll} />
    </div>
  );
}

Tags.propTypes = {
  url: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  showUnselectAll: PropTypes.bool,
  unselectAllButtonTitle: PropTypes.string,
};
