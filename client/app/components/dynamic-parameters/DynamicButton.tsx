import React, { useRef } from "react";
import { isFunction, get, findIndex } from "lodash";
import Dropdown from "antd/lib/dropdown";
import Menu from "antd/lib/menu";
import Typography from "antd/lib/typography";
// @ts-expect-error ts-migrate(6133) FIXME: 'DynamicDateType' is declared but its value is nev... Remove this comment to see the full error message
import { DynamicDateType } from "@/services/parameters/DateParameter";
// @ts-expect-error ts-migrate(6133) FIXME: 'DynamicDateRangeType' is declared but its value i... Remove this comment to see the full error message
import { DynamicDateRangeType } from "@/services/parameters/DateRangeParameter";

import ArrowLeftOutlinedIcon from "@ant-design/icons/ArrowLeftOutlined";
import ThunderboltTwoToneIcon from "@ant-design/icons/ThunderboltTwoTone";
import ThunderboltOutlinedIcon from "@ant-design/icons/ThunderboltOutlined";

import "./DynamicButton.less";

const { Text } = Typography;

type OwnProps = {
    options?: any[];
    // @ts-expect-error ts-migrate(2749) FIXME: 'DynamicDateType' refers to a value, but is being ... Remove this comment to see the full error message
    selectedDynamicValue?: DynamicDateType | DynamicDateRangeType;
    onSelect?: (...args: any[]) => any;
    enabled?: boolean;
    staticValueLabel?: string;
};

type Props = OwnProps & typeof DynamicButton.defaultProps;

function DynamicButton({ options, selectedDynamicValue, onSelect, enabled, staticValueLabel }: Props) {
  const menu = (
    <Menu
      className="dynamic-menu"
      onClick={({ key }) => onSelect(get(options, key, "static"))}
      // @ts-expect-error ts-migrate(2345) FIXME: Argument of type '{ value: any; }' is not assignab... Remove this comment to see the full error message
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
          <ArrowLeftOutlinedIcon />
          <Text type="secondary">{staticValueLabel}</Text>
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
          icon={
            enabled ? (
              <ThunderboltTwoToneIcon className="dynamic-icon" />
            ) : (
              <ThunderboltOutlinedIcon className="dynamic-icon" />
            )
          }
          // @ts-expect-error ts-migrate(2322) FIXME: Type '() => null' is not assignable to type '(trig... Remove this comment to see the full error message
          getPopupContainer={() => containerRef.current}
          data-test="DynamicButton"
        />
      </a>
    </div>
  );
}

DynamicButton.defaultProps = {
  options: [],
  selectedDynamicValue: null,
  onSelect: () => {},
  enabled: false,
  staticValueLabel: "Back to Static Value",
};

export default DynamicButton;
