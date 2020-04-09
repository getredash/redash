import React from "react";
import PropTypes from "prop-types";
import { EditorPropTypes } from "@/visualizations/prop-types";
import registeredVisualizations from "@/visualizations";

export default function Editor({ type, ...otherProps }) {
  const { Editor } = registeredVisualizations[type];
  return <Editor {...otherProps} />;
}

Editor.propTypes = {
  type: PropTypes.oneOf(Object.keys(registeredVisualizations)).isRequired,
  ...EditorPropTypes,
};
