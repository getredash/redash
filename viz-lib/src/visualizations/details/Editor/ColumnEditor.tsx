import React from "react";
import SharedColumnEditor from "../../shared/components/ColumnEditor";

type OwnProps = {
  column: {
    name: string;
    title?: string;
    visible?: boolean;
    alignContent?: "left" | "center" | "right";
    displayAs?: any;
    description?: string;
  };
  onChange?: (...args: any[]) => any;
};

const columnEditorDefaultProps = {
  onChange: (...args: any[]) => {},
};

type Props = OwnProps & typeof columnEditorDefaultProps;

export default function ColumnEditor({ column, onChange }: Props) {
  return (
    <SharedColumnEditor
      column={column}
      onChange={onChange}
      variant="details"
      showSearch={false}
    />
  );
}

ColumnEditor.defaultProps = columnEditorDefaultProps;
