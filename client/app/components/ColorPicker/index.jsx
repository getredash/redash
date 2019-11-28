import { toString } from 'lodash';
import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';
import tinycolor from 'tinycolor2';
import Popover from 'antd/lib/popover';
import Card from 'antd/lib/card';
import Tooltip from 'antd/lib/tooltip';
import Icon from 'antd/lib/icon';

import ColorInput from './Input';
import Swatch from './Swatch';
import Label from './Label';
import { validateColor } from './utils';

import './index.less';

export default function ColorPicker({
  color, placement, presetColors, presetColumns, interactive, children, onChange, triggerProps,
}) {
  const [visible, setVisible] = useState(false);
  const validatedColor = useMemo(() => validateColor(color), [color]);
  const [currentColor, setCurrentColor] = useState('');

  function handleApply() {
    setVisible(false);
    if (!interactive) {
      onChange(currentColor);
    }
  }

  function handleCancel() {
    setVisible(false);
  }

  const actions = [];
  if (!interactive) {
    actions.push((
      <Tooltip key="cancel" title="Cancel">
        <Icon type="close" onClick={handleCancel} />
      </Tooltip>
    ));
    actions.push((
      <Tooltip key="apply" title="Apply">
        <Icon type="check" onClick={handleApply} />
      </Tooltip>
    ));
  }

  function handleInputChange(newColor) {
    setCurrentColor(newColor);
    if (interactive) {
      onChange(newColor);
    }
  }

  useEffect(() => {
    if (visible) {
      setCurrentColor(validatedColor);
    }
  }, [validatedColor, visible]);

  return (
    <Popover
      arrowPointAtCenter
      overlayClassName={`color-picker ${interactive ? 'color-picker-interactive' : 'color-picker-with-actions'}`}
      overlayStyle={{ '--color-picker-selected-color': currentColor }}
      content={(
        <Card
          data-test="ColorPicker"
          className="color-picker-panel"
          bordered={false}
          title={toString(currentColor).toUpperCase()}
          headStyle={{
            backgroundColor: currentColor,
            color: tinycolor(currentColor).isLight() ? '#000000' : '#ffffff',
          }}
          actions={actions}
        >
          <ColorInput
            color={currentColor}
            presetColors={presetColors}
            presetColumns={presetColumns}
            onChange={handleInputChange}
            onPressEnter={handleApply}
          />
        </Card>
      )}
      trigger="click"
      placement={placement}
      visible={visible}
      onVisibleChange={setVisible}
    >
      {children || (
        <Swatch
          color={validatedColor}
          size={30}
          {...triggerProps}
          className={cx('color-picker-trigger', triggerProps.className)}
        />
      )}
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
  presetColors: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.string), // array of colors (no tooltips)
    PropTypes.objectOf(PropTypes.string), // color name => color value
  ]),
  presetColumns: PropTypes.number,
  interactive: PropTypes.bool,
  triggerProps: PropTypes.object, // eslint-disable-line react/forbid-prop-types
  children: PropTypes.node,
  onChange: PropTypes.func,
};

ColorPicker.defaultProps = {
  color: '#FFFFFF',
  placement: 'top',
  presetColors: null,
  presetColumns: 8,
  interactive: false,
  triggerProps: {},
  children: null,
  onChange: () => {},
};

ColorPicker.Input = ColorInput;
ColorPicker.Swatch = Swatch;
ColorPicker.Label = Label;
