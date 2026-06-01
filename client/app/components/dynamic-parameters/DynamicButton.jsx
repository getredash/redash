import React, { useRef } from "react";
import PropTypes from "prop-types";
import { isFunction, get, findIndex } from "lodash";
import Dropdown from "antd/lib/dropdown";
import Button from "antd/lib/button";
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
  const selectedIndex = findIndex(options, { value: selectedDynamicValue });
  const menuItems = [
    ...options.map((option, index) => ({
      key: `${index}`,
      label: (
        <>
          {option.name} {option.label && <em>{isFunction(option.label) ? option.label() : option.label}</em>}
        </>
      ),
    })),
    ...(enabled ? [{ type: "divider" }] : []),
    ...(enabled
      ? [
          {
            key: "static",
            label: (
              <>
                <ArrowLeftOutlinedIcon />
                <Text type="secondary">{staticValueLabel}</Text>
              </>
            ),
          },
        ]
      : []),
  ];

  const containerRef = useRef(null);

  return (
    <div ref={containerRef}>
      <div className="dynamic-button" role="presentation" onClick={(e) => e.stopPropagation()}>
        <Dropdown
          placement="bottomRight"
          trigger={["click"]}
          getPopupContainer={() => containerRef.current}
          menu={{
            className: "dynamic-menu",
            items: menuItems,
            selectedKeys: selectedIndex >= 0 ? [`${selectedIndex}`] : enabled ? ["static"] : [],
            "data-test": "DynamicButtonMenu",
            onClick: ({ key }) => onSelect(key === "static" ? "static" : get(options, key, "static")),
          }}
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
