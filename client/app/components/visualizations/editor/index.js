import React from "react";
import AntSelect from "antd/lib/select";
import AntInput from "antd/lib/input";
import AntInputNumber from "antd/lib/input-number";
import AntCheckbox from "antd/lib/checkbox";

import RedashColorPicker from "@/components/ColorPicker";
import RedashTextAlignmentSelect from "@/components/TextAlignmentSelect";

import withControlLabel, { ControlLabel } from "./withControlLabel";
import createTabbedEditor from "./createTabbedEditor";
import Section from "./Section";
import Switch from "./Switch";
import ContextHelp from "./ContextHelp";

export function Checkbox(props) {
  return (
    <div className="visualization-editor-control-label">
      <AntCheckbox {...props} />
    </div>
  );
}

export { Section, ControlLabel, Switch, ContextHelp, withControlLabel, createTabbedEditor };
export const Select = withControlLabel(AntSelect);
export const Input = withControlLabel(AntInput);
export const TextArea = withControlLabel(AntInput.TextArea);
export const InputNumber = withControlLabel(AntInputNumber);
export const ColorPicker = withControlLabel(RedashColorPicker);
export const TextAlignmentSelect = withControlLabel(RedashTextAlignmentSelect);
