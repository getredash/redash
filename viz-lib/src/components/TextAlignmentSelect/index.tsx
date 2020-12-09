import { pickBy, startsWith } from "lodash";
import React from "react";
import PropTypes from "prop-types";
import cx from "classnames";
import Radio from "antd/lib/radio";
import Tooltip from "antd/lib/tooltip";

import AlignLeftOutlinedIcon from "@ant-design/icons/AlignLeftOutlined";
import AlignCenterOutlinedIcon from "@ant-design/icons/AlignCenterOutlined";
import AlignRightOutlinedIcon from "@ant-design/icons/AlignRightOutlined";

import "./index.less";

export default function TextAlignmentSelect({ className, ...props }) {
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

TextAlignmentSelect.propTypes = {
  className: PropTypes.string,
};

TextAlignmentSelect.defaultProps = {
  className: null,
};
