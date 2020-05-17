import React, { useMemo } from "react";
import PropTypes from "prop-types";
import { EditorPropTypes } from "@/visualizations/prop-types";
import registeredVisualizations from "@/visualizations/registeredVisualizations";

export default function Editor({ type, options: optionsProp, data, ...otherProps }) {
  const { Editor, getOptions } = registeredVisualizations[type];
  const options = useMemo(() => getOptions(optionsProp, data), [optionsProp, data]);

  return <Editor options={options} data={data} {...otherProps} />;
}

Editor.propTypes = {
  type: PropTypes.string.isRequired,
  ...EditorPropTypes,
};
