import React from "react";
import PropTypes from "prop-types";
import Button from "antd/lib/button";
import FormOutlinedIcon from "@ant-design/icons/FormOutlined";

export default function EditVisualizationButton(props) {
  return (
    <Button
      data-test="EditVisualization"
      className="edit-visualization"
      onClick={() => props.openVisualizationEditor(props.selectedTab)}>
      <FormOutlinedIcon />
      <span className="hidden-xs hidden-s hidden-m">Edit Visualization</span>
    </Button>
  );
}

EditVisualizationButton.propTypes = {
  openVisualizationEditor: PropTypes.func.isRequired,
  selectedTab: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

EditVisualizationButton.defaultProps = {
  selectedTab: "",
};
