import AntSelect from "antd/lib/select";
import AntInput from "antd/lib/input";
import AntInputNumber from "antd/lib/input-number";
import Checkbox from "antd/lib/checkbox";

import RedashColorPicker from "@/components/ColorPicker";
import RedashTextAlignmentSelect from "@/components/TextAlignmentSelect";

import withControlLabel, { ControlLabel } from "./withControlLabel";
import createTabbedEditor from "./createTabbedEditor";
import Section from "./Section";
import Switch from "./Switch";
import ContextHelp from "./ContextHelp";

export { Section, ControlLabel, Checkbox, Switch, ContextHelp, withControlLabel, createTabbedEditor };
export const Select = withControlLabel(AntSelect);
export const Input = withControlLabel(AntInput);
export const TextArea = withControlLabel(AntInput.TextArea);
export const InputNumber = withControlLabel(AntInputNumber);
export const ColorPicker = withControlLabel(RedashColorPicker);
export const TextAlignmentSelect = withControlLabel(RedashTextAlignmentSelect);
