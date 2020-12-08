import React from "react";
import Button from "antd/lib/button";
import FormOutlinedIcon from "@ant-design/icons/FormOutlined";

type OwnProps = {
    openVisualizationEditor: (...args: any[]) => any;
    selectedTab?: string | number;
};

type Props = OwnProps & typeof EditVisualizationButton.defaultProps;

export default function EditVisualizationButton(props: Props) {
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

EditVisualizationButton.defaultProps = {
  selectedTab: "",
};
