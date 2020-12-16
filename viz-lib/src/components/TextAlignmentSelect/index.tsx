import { pickBy, startsWith } from "lodash";
import React from "react";
import cx from "classnames";
import Radio from "antd/lib/radio";
import Tooltip from "antd/lib/tooltip";

import AlignLeftOutlinedIcon from "@ant-design/icons/AlignLeftOutlined";
import AlignCenterOutlinedIcon from "@ant-design/icons/AlignCenterOutlined";
import AlignRightOutlinedIcon from "@ant-design/icons/AlignRightOutlined";

import "./index.less";

type OwnProps = {
    className?: string;
};

type Props = OwnProps & typeof TextAlignmentSelect.defaultProps;

// @ts-expect-error ts-migrate(2700) FIXME: Rest types may only be created from object types.
export default function TextAlignmentSelect({ className, ...props }: Props) {
  return (
    // Antd RadioGroup does not use any custom attributes
    <div {...pickBy(props, (v, k) => startsWith(k, "data-"))}>
      <Radio.Group className={cx("text-alignment-select", className)} {...props}>
        <Tooltip title="Align left" mouseEnterDelay={0} mouseLeaveDelay={0}>
          <Radio.Button value="left" data-test="TextAlignmentSelect.Left">
            <AlignLeftOutlinedIcon />
          </Radio.Button>
        </Tooltip>
        <Tooltip title="Align center" mouseEnterDelay={0} mouseLeaveDelay={0}>
          <Radio.Button value="center" data-test="TextAlignmentSelect.Center">
            <AlignCenterOutlinedIcon />
          </Radio.Button>
        </Tooltip>
        <Tooltip title="Align right" mouseEnterDelay={0} mouseLeaveDelay={0}>
          <Radio.Button value="right" data-test="TextAlignmentSelect.Right">
            <AlignRightOutlinedIcon />
          </Radio.Button>
        </Tooltip>
      </Radio.Group>
    </div>
  );
}

TextAlignmentSelect.defaultProps = {
  className: null,
};
