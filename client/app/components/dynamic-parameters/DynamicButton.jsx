import React, { useRef } from "react";
import PropTypes from "prop-types";
import { isFunction, get, findIndex } from "lodash";
import Dropdown from "antd/lib/dropdown";
import Button from "antd/lib/button";
import Menu from "antd/lib/menu";
import Typography from "antd/lib/typography";
import { DynamicDateType } from "@/services/parameters/DateParameter";
import { DynamicDateRangeType } from "@/services/parameters/DateRangeParameter";

import ArrowLeftOutlinedIcon from "@ant-design/icons/ArrowLeftOutlined";
import ThunderboltTwoToneIcon from "@ant-design/icons/ThunderboltTwoTone";
import ThunderboltOutlinedIcon from "@ant-design/icons/ThunderboltOutlined";

import "./DynamicButton.less";

const { Text } = Typography;

function DynamicButton({
  options = [],
  selectedDynamicValue = null,
  onSelect = () => {},
  enabled = false,
  staticValueLabel = "Back to Static Value",
}) {
  const menu = (
    <Menu
      className="dynamic-menu"
      onClick={({ key }) => onSelect(get(options, key, "static"))}
      selectedKeys={[`${findIndex(options, { value: selectedDynamicValue })}`]}
      data-test="DynamicButtonMenu"
    >
      {options.map((option, index) => (
        // eslint-disable-next-line react/no-array-index-key
        <Menu.Item key={index}>
          {option.name} {option.label && <em>{isFunction(option.label) ? option.label() : option.label}</em>}
        </Menu.Item>
      ))}
      {enabled && <Menu.Divider />}
      {enabled && (
        <Menu.Item>
          <ArrowLeftOutlinedIcon />
          <Text type="secondary">{staticValueLabel}</Text>
        </Menu.Item>
      )}
    </Menu>
  );

  const containerRef = useRef(null);

  return (
    <div ref={containerRef}>
      <div className="dynamic-button" role="presentation" onClick={(e) => e.stopPropagation()}>
        <Dropdown
          overlay={menu}
          placement="bottomRight"
          trigger={["click"]}
          getPopupContainer={() => containerRef.current}
        >
          <Button
            data-test="DynamicButton"
            icon={
              enabled ? (
                <ThunderboltTwoToneIcon className="dynamic-icon" />
              ) : (
                <ThunderboltOutlinedIcon className="dynamic-icon" />
              )
            }
          />
        </Dropdown>
      </div>
    </div>
  );
}

DynamicButton.propTypes = {
  options: PropTypes.arrayOf(PropTypes.object), // eslint-disable-line react/forbid-prop-types
  selectedDynamicValue: PropTypes.oneOfType([DynamicDateType, DynamicDateRangeType]),
  onSelect: PropTypes.func,
  enabled: PropTypes.bool,
  staticValueLabel: PropTypes.string,
};

export default DynamicButton;
