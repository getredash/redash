import { isFunction, isString, filter, map } from "lodash";
import React from "react";
import PropTypes from "prop-types";
import Input from "antd/lib/input";
import AntdMenu from "antd/lib/menu";
import Select from "antd/lib/select";
import TagsList from "@/components/TagsList";

/*
    SearchInput
 */

export function SearchInput({ placeholder, value, showIcon, onChange }) {
  const InputControl = showIcon ? Input.Search : Input;
  return (
    <div className="m-b-10">
      <InputControl
        className="form-control"
        placeholder={placeholder}
        defaultValue={value}
        onChange={event => onChange(event.target.value)}
        autoFocus
      />
    </div>
  );
}

SearchInput.propTypes = {
  placeholder: PropTypes.string,
  value: PropTypes.string.isRequired,
  showIcon: PropTypes.bool,
  onChange: PropTypes.func.isRequired,
};

SearchInput.defaultProps = {
  placeholder: "Search...",
  showIcon: false,
};

/*
    Menu
 */

export function Menu({ items, selected }) {
  items = filter(items, item => (isFunction(item.isAvailable) ? item.isAvailable() : true));
  if (items.length === 0) {
    return null;
  }
  return (
    <div className="m-b-10 tags-list tiled">
      <AntdMenu className="invert-stripe-position" mode="inline" selectable={false} selectedKeys={[selected]}>
        {map(items, item => (
          <AntdMenu.Item key={item.key} className="m-0">
            <a href={item.href}>
              {isString(item.icon) && item.icon !== "" && (
                <span className="btn-favourite m-r-5">
                  <i className={item.icon} aria-hidden="true" />
                </span>
              )}
              {isFunction(item.icon) && (item.icon(item) || null)}
              {item.title}
            </a>
          </AntdMenu.Item>
        ))}
      </AntdMenu>
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
    <span className="btn-favourite m-r-5">
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

export function Tags({ url, onChange }) {
  if (url === "") {
    return null;
  }
  return (
    <div className="m-b-10">
      <TagsList tagsUrl={url} onUpdate={onChange} />
    </div>
  );
}

Tags.propTypes = {
  url: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

/*
    PageSizeSelect
 */

export function PageSizeSelect({ options, value, onChange, ...props }) {
  return (
    <div {...props}>
      <Select className="w-100" defaultValue={value} onChange={onChange}>
        {map(options, option => (
          <Select.Option key={option} value={option}>
            {option} results
          </Select.Option>
        ))}
      </Select>
    </div>
  );
}

PageSizeSelect.propTypes = {
  options: PropTypes.arrayOf(PropTypes.number).isRequired,
  value: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
};
