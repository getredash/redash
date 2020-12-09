import { isNil, isArray, chunk, map, filter, toPairs } from "lodash";
import React, { useState, useEffect } from "react";
import tinycolor from "tinycolor2";
import TextInput from "antd/lib/input";
import Typography from "antd/lib/typography";
import Swatch from "./Swatch";

import "./input.less";

function preparePresets(presetColors: any, presetColumns: any) {
  presetColors = isArray(presetColors) ? map(presetColors, v => [null, v]) : toPairs(presetColors);
  presetColors = map(presetColors, ([title, value]) => {
    if (isNil(value)) {
      return [title, null];
    }
    value = tinycolor(value);
    if (value.isValid()) {
      return [title, "#" + value.toHex().toUpperCase()];
    }
    return null;
  });
  return chunk(filter(presetColors), presetColumns);
}

function validateColor(value: any, callback: any, prefix = "#") {
  if (isNil(value)) {
    callback(null);
  }
  value = tinycolor(value);
  if (value.isValid()) {
    callback(prefix + value.toHex().toUpperCase());
  }
}

type OwnProps = {
    color?: string;
    presetColors?: string[] | {
        [key: string]: string;
    };
    presetColumns?: number;
    onChange?: (...args: any[]) => any;
    onPressEnter?: (...args: any[]) => any;
};

type Props = OwnProps & typeof Input.defaultProps;

export default function Input({ color, presetColors, presetColumns, onChange, onPressEnter }: Props) {
  const [inputValue, setInputValue] = useState("");
  const [isInputFocused, setIsInputFocused] = useState(false);

  const presets = preparePresets(presetColors, presetColumns);

  function handleInputChange(value: any) {
    setInputValue(value);
    validateColor(value, onChange);
  }

  useEffect(() => {
    if (!isInputFocused) {
      validateColor(color, setInputValue, "");
    }
  }, [color, isInputFocused]);

  return (
    <React.Fragment>
      {map(presets, (group, index) => (
        <div className="color-picker-input-swatches" key={`preset-row-${index}`}>
          {map(group, ([title, value]) => (
            // @ts-expect-error ts-migrate(2322) FIXME: Type 'any' is not assignable to type 'never'.
            <Swatch key={value} color={value} title={title} size={30} onClick={() => validateColor(value, onChange)} />
          ))}
        </div>
      ))}
      <div className="color-picker-input">
        <TextInput
          data-test="ColorPicker.CustomColor"
          addonBefore={<Typography.Text type="secondary">#</Typography.Text>}
          value={inputValue}
          onChange={e => handleInputChange(e.target.value)}
          onFocus={() => setIsInputFocused(true)}
          onBlur={() => setIsInputFocused(false)}
          onPressEnter={onPressEnter}
        />
      </div>
    </React.Fragment>
  );
}

Input.defaultProps = {
  color: "#FFFFFF",
  presetColors: null,
  presetColumns: 8,
  onChange: () => {},
  onPressEnter: () => {},
};
