import { isNil, isArray, chunk, map, filter, toPairs } from "lodash";
import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import tinycolor from "tinycolor2";
import TextInput from "antd/lib/input";
import Typography from "antd/lib/typography";
import Swatch from "./Swatch";

import "./input.less";

function preparePresets(presetColors, presetColumns) {
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

function validateColor(value, callback, prefix = "#") {
  if (isNil(value)) {
    callback(null);
  }
  value = tinycolor(value);
  if (value.isValid()) {
    callback(prefix + value.toHex().toUpperCase());
  }
}

export default function Input({ color, presetColors, presetColumns, onChange, onPressEnter }) {
  const [inputValue, setInputValue] = useState("");
  const [isInputFocused, setIsInputFocused] = useState(false);

  const presets = preparePresets(presetColors, presetColumns);

  function handleInputChange(value) {
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

Input.propTypes = {
  color: PropTypes.string,
  presetColors: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.string), // array of colors (no tooltips)
    PropTypes.objectOf(PropTypes.string), // color name => color value
  ]),
  presetColumns: PropTypes.number,
  onChange: PropTypes.func,
  onPressEnter: PropTypes.func,
};

Input.defaultProps = {
  color: "#FFFFFF",
  presetColors: null,
  presetColumns: 8,
  onChange: () => {},
  onPressEnter: () => {},
};
