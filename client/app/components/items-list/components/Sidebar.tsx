import { isFunction, isString, filter, map } from "lodash";
import React, { useState, useCallback, useEffect } from "react";
import Input from "antd/lib/input";
import AntdMenu from "antd/lib/menu";
import Link from "@/components/Link";
import TagsList from "@/components/TagsList";
type OwnSearchInputProps = {
    placeholder?: string;
    value: string;
    showIcon?: boolean;
    onChange: (...args: any[]) => any;
};
type SearchInputProps = OwnSearchInputProps & typeof SearchInput.defaultProps;
/*
    SearchInput
 */
export function SearchInput({ placeholder, value, showIcon, onChange }: SearchInputProps) {
    const [currentValue, setCurrentValue] = useState(value);
    useEffect(() => {
        setCurrentValue(value);
    }, [value]);
    const onInputChange = useCallback(event => {
        const newValue = event.target.value;
        setCurrentValue(newValue);
        onChange(newValue);
    }, [onChange]);
    const InputControl = showIcon ? Input.Search : Input;
    return (<div className="m-b-10">
      <InputControl className="form-control" placeholder={placeholder} value={currentValue} onChange={onInputChange}/>
    </div>);
}
SearchInput.defaultProps = {
    placeholder: "Search...",
    showIcon: false,
};
type OwnMenuProps = {
    items?: {
        key: string;
        href: string;
        title: string;
        icon?: (...args: any[]) => any;
        isAvailable?: (...args: any[]) => any;
    }[];
    selected?: string;
};
type MenuProps = OwnMenuProps & typeof Menu.defaultProps;
/*
    Menu
 */
export function Menu({ items, selected }: MenuProps) {
    // @ts-expect-error ts-migrate(2322) FIXME: Type 'string[]' is not assignable to type 'never'.
    items = filter(items, item => (isFunction((item as any).isAvailable) ? (item as any).isAvailable() : true));
    if ((items as any).length === 0) {
        return null;
    }
    return (<div className="m-b-10 tags-list tiled">
      <AntdMenu className="invert-stripe-position" mode="inline" selectable={false} selectedKeys={[selected]}>
        {/* @ts-expect-error ts-migrate(2571) FIXME: Object is of type 'unknown'. */}
        {map(items, item => (<AntdMenu.Item key={item.key} className="m-0">
            {/* @ts-expect-error ts-migrate(2571) FIXME: Object is of type 'unknown'. */}
            <Link href={item.href}>
              {/* @ts-expect-error ts-migrate(2571) FIXME: Object is of type 'unknown'. */}
              {isString(item.icon) && item.icon !== "" && (<span className="btn-favourite m-r-5">
                  {/* @ts-expect-error ts-migrate(2571) FIXME: Object is of type 'unknown'. */}
                  <i className={item.icon} aria-hidden="true"/>
                </span>)}
              {/* @ts-expect-error ts-migrate(2571) FIXME: Object is of type 'unknown'. */}
              {isFunction(item.icon) && (item.icon(item) || null)}
              {/* @ts-expect-error ts-migrate(2571) FIXME: Object is of type 'unknown'. */}
              {item.title}
            </Link>
          </AntdMenu.Item>))}
      </AntdMenu>
    </div>);
}
Menu.defaultProps = {
    items: [],
    selected: null,
};
type MenuIconProps = {
    icon: string;
};
/*
    MenuIcon
 */
export function MenuIcon({ icon }: MenuIconProps) {
    return (<span className="btn-favourite m-r-5">
      <i className={icon} aria-hidden="true"/>
    </span>);
}
type ProfileImageProps = {
    user: {
        profile_image_url?: string;
        name?: string;
    };
};
/*
    ProfileImage
 */
export function ProfileImage({ user }: ProfileImageProps) {
    if (!isString(user.profile_image_url) || user.profile_image_url === "") {
        return null;
    }
    return <img src={user.profile_image_url} className="profile__image--sidebar m-r-5" width="13" alt={user.name}/>;
}
type TagsProps = {
    url: string;
    onChange: (...args: any[]) => any;
    showUnselectAll?: boolean;
    unselectAllButtonTitle?: string;
};
/*
    Tags
 */
export function Tags({ url, onChange, showUnselectAll }: TagsProps) {
    if (url === "") {
        return null;
    }
    return (<div className="m-b-10">
      {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'boolean | undefined' is not assignable to ty... Remove this comment to see the full error message */}
      <TagsList tagsUrl={url} onUpdate={onChange} showUnselectAll={showUnselectAll}/>
    </div>);
}
