import React, { useRef } from "react";
import PropTypes from "prop-types";
import { isFunction, get, findIndex } from "lodash";
import Dropdown from "antd/lib/dropdown";
import Icon from "antd/lib/icon";
import Menu from "antd/lib/menu";
import Typography from "antd/lib/typography";
import { DynamicDateType } from "@/services/parameters/DateParameter";
import { DynamicDateRangeType } from "@/services/parameters/DateRangeParameter";

import "./DynamicButton.less";

const { Text } = Typography;

function DynamicButton({ options, selectedDynamicValue, onSelect, enabled }) {
  const menu = (
    <Menu
      className="dynamic-menu"
      onClick={({ key }) => onSelect(get(options, key, "static"))}
      selectedKeys={[`${findIndex(options, { value: selectedDynamicValue })}`]}
      data-test="DynamicButtonMenu">
      {options.map((option, index) => (
        // eslint-disable-next-line react/no-array-index-key
        <Menu.Item key={index}>
          {option.name} {option.label && <em>{isFunction(option.label) ? option.label() : option.label}</em>}
        </Menu.Item>
      ))}
      {enabled && <Menu.Divider />}
      {enabled && (
        <Menu.Item>
          <Icon type="arrow-left" />
          <Text type="secondary">Back to Static Value</Text>
        </Menu.Item>
      )}
    </Menu>
  );

  const containerRef = useRef(null);

  return (
    <div ref={containerRef}>
      <a onClick={e => e.stopPropagation()}>
        <Dropdown.Button
          overlay={menu}
          className="dynamic-button"
          placement="bottomRight"
          trigger={["click"]}
          icon={<Icon type="thunderbolt" theme={enabled ? "twoTone" : "outlined"} className="dynamic-icon" />}
          getPopupContainer={() => containerRef.current}
          data-test="DynamicButton"
        />
      </a>
    </div>
  );
}

DynamicButton.propTypes = {
  options: PropTypes.arrayOf(PropTypes.object), // eslint-disable-line react/forbid-prop-types
  selectedDynamicValue: PropTypes.oneOfType([DynamicDateType, DynamicDateRangeType]),
  onSelect: PropTypes.func,
  enabled: PropTypes.bool,
};

DynamicButton.defaultProps = {
  options: [],
  selectedDynamicValue: null,
  onSelect: () => {},
  enabled: false,
};

export default DynamicButton;
