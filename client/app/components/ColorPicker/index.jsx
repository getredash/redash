import React, { useState } from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';
import Popover from 'antd/lib/popover';

import Panel from './Panel';
import Swatch from './Swatch';

import './index.less';

export default function ColorPicker({
  color, placement, presetColors, presetColumns, triggerSize, interactive, children, onChange,
}) {
  const [visible, setVisible] = useState(false);
  const [currentColor, setCurrentColor] = useState(color);

  function handleApply(selectedColor, shouldClose = true) {
    onChange(selectedColor);
    if (shouldClose) {
      setVisible(false);
    }
  }

  function handleCancel(unused, shouldClose = true) {
    if (shouldClose) {
      setVisible(false);
    }
  }

  return (
    <Popover
      overlayClassName={cx(
        'color-picker',
        interactive ? 'color-picker-interactive' : 'color-picker-with-actions',
      )}
      overlayStyle={{ '--color-picker-selected-color': currentColor }}
      content={(
        <Panel
          color={color}
          presetColors={presetColors}
          presetColumns={presetColumns}
          interactive={interactive}
          visible={visible}
          onChange={setCurrentColor}
          onApply={handleApply}
          onCancel={handleCancel}
        />
      )}
      trigger="click"
      placement={placement}
      visible={visible}
      onVisibleChange={setVisible}
    >
      {children || (<Swatch className="color-picker-trigger" color={color} size={triggerSize} />)}
    </Popover>
  );
}

ColorPicker.propTypes = {
  color: PropTypes.string,
  placement: PropTypes.oneOf([
    'top', 'left', 'right', 'bottom',
    'topLeft', 'topRight', 'bottomLeft', 'bottomRight',
    'leftTop', 'leftBottom', 'rightTop', 'rightBottom',
  ]),
  presetColors: PropTypes.arrayOf(PropTypes.string),
  presetColumns: PropTypes.number,
  triggerSize: PropTypes.number,
  interactive: PropTypes.bool,
  children: PropTypes.node,
  onChange: PropTypes.func,
};

ColorPicker.defaultProps = {
  color: '#FFFFFF',
  placement: 'top',
  presetColors: null,
  presetColumns: 8,
  triggerSize: 30,
  interactive: false,
  children: null,
  onChange: () => {},
};

ColorPicker.Panel = Panel;
ColorPicker.Swatch = Swatch;
