import React from "react";
import cx from "classnames";
import AntInput from "antd/lib/input";
import withControlLabel from "./withControlLabel";

import "./TextArea.less";

function TextArea({
  className,
  ...otherProps
}: any) {
  return <AntInput.TextArea className={cx("visualization-editor-text-area", className)} {...otherProps} />;
}

export default withControlLabel(TextArea);
