import React from "react";
import SharedColumnEditor from "../../shared/components/ColumnEditor";

type OwnProps = {
  column: {
    name: string;
    title?: string;
    visible?: boolean;
    alignContent?: "left" | "center" | "right";
    displayAs?: any;
    allowSearch?: boolean;
    description?: string;
  };
  onChange?: (...args: any[]) => any;
};

type Props = OwnProps & typeof ColumnEditor.defaultProps;

export default function ColumnEditor({ column, onChange }: Props) {
  return (
    <SharedColumnEditor
      column={column}
      onChange={onChange}
      variant="table"
      showSearch={true}
    />
  );
}

ColumnEditor.defaultProps = {
  onChange: () => {},
};
