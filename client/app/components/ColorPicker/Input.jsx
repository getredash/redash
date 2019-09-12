import { chunk, map } from 'lodash';
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import tinycolor from 'tinycolor2';
import TextInput from 'antd/lib/input';
import Typography from 'antd/lib/typography';
import Swatch from './Swatch';

import './input.less';

function validateColor(value, callback, prefix = '#') {
  value = tinycolor(value);
  if (value.isValid()) {
    callback(prefix + value.toHex().toUpperCase());
  }
}

export default function Input({ color, presetColors, presetColumns, onChange, onPressEnter }) {
  const [inputValue, setInputValue] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);

  presetColors = chunk(presetColors, presetColumns);

  function handleInputChange(value) {
    setInputValue(value);
    validateColor(value, onChange);
  }

  useEffect(() => {
    if (!isInputFocused) {
      validateColor(color, setInputValue, '');
    }
  }, [color, isInputFocused]);

  return (
    <React.Fragment>
      {map(presetColors, (group, index) => (
        <div className="color-picker-input-swatches" key={`preset-row-${index}`}>
          {map(group, c => <Swatch key={c} color={c} size={30} onClick={() => validateColor(c, onChange)} />)}
        </div>
      ))}
      <div className="color-picker-input">
        <TextInput
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
  presetColors: PropTypes.arrayOf(PropTypes.string),
  presetColumns: PropTypes.number,
  onChange: PropTypes.func,
  onPressEnter: PropTypes.func,
};

Input.defaultProps = {
  color: '#FFFFFF',
  presetColors: null,
  presetColumns: 8,
  onChange: () => {},
  onPressEnter: () => {},
};
