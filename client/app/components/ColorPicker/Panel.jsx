import { chunk, map, toString } from 'lodash';
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import tinycolor from 'tinycolor2';
import Card from 'antd/lib/card';
import Icon from 'antd/lib/icon';
import Tooltip from 'antd/lib/tooltip';
import Input from 'antd/lib/input';
import Typography from 'antd/lib/typography';
import Swatch from './Swatch';

import './panel.less';

export default function Panel({
  color, presetColors, presetColumns, interactive, visible, onChange, onApply, onCancel,
}) {
  const [selectedColor, setSelectedColor] = useState(color);
  const [inputValue, setInputValue] = useState(color);

  function updateSelectedColor(value, isUserInput = false) {
    if (isUserInput) {
      setInputValue(value);
    }
    value = tinycolor(value);
    if (value.isValid()) {
      value = '#' + value.toHex().toUpperCase();
      setSelectedColor(value);
      if (!isUserInput) {
        setInputValue(toString(value).toUpperCase().substr(1));
      }
      if (value !== selectedColor) {
        onChange(value);
        if (interactive) {
          onApply(value, false);
        }
      }
    }
  }

  useEffect(() => {
    if (visible) {
      updateSelectedColor(color);
    }
  }, [color, visible]);

  const actions = [];
  if (!interactive) {
    actions.push((
      <Tooltip key="cancel" title="Cancel">
        <Icon type="close" onClick={() => { updateSelectedColor(color); onCancel(color, true); }} />
      </Tooltip>
    ));
    actions.push((
      <Tooltip key="apply" title="Apply">
        <Icon type="check" onClick={() => onApply(selectedColor, true)} />
      </Tooltip>
    ));
  }

  presetColors = chunk(presetColors, presetColumns);

  return (
    <Card
      className="color-picker-panel"
      bordered={false}
      title={toString(selectedColor).toUpperCase()}
      headStyle={{
        backgroundColor: selectedColor,
        color: tinycolor(selectedColor).isLight() ? '#000000' : '#ffffff',
      }}
      actions={actions}
    >
      {map(presetColors, (group, index) => (
        <div className="color-picker-panel-block" key={`preset-row-${index}`}>
          {map(group, c => <Swatch key={c} color={c} size={30} onClick={() => updateSelectedColor(c)} />)}
        </div>
      ))}
      <div className="color-picker-panel-block">
        <Input
          addonBefore={<Typography.Text type="secondary">#</Typography.Text>}
          value={inputValue}
          onChange={e => updateSelectedColor(e.target.value, true)}
          onBlur={() => updateSelectedColor(selectedColor)}
          onPressEnter={() => onApply(selectedColor, true)}
        />
      </div>
    </Card>
  );
}

Panel.propTypes = {
  color: PropTypes.string,
  presetColors: PropTypes.arrayOf(PropTypes.string),
  presetColumns: PropTypes.number,
  visible: PropTypes.bool,
  interactive: PropTypes.bool,
  onChange: PropTypes.func,
  onApply: PropTypes.func,
  onCancel: PropTypes.func,
};

Panel.defaultProps = {
  color: '#FFFFFF',
  presetColors: null,
  presetColumns: 8,
  visible: false,
  interactive: false,
  onChange: () => {},
  onApply: () => {},
  onCancel: () => {},
};
