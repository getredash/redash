import React from 'react';
import PropTypes from 'prop-types';
import { react2angular } from 'react2angular';

import './color-box.less';

export function ColorBox({ color }) {
  return <span style={{ backgroundColor: color }} />;
}

ColorBox.propTypes = {
  color: PropTypes.string,
};

ColorBox.defaultProps = {
  color: 'transparent',
};

export default function init(ngModule) {
  ngModule.component('colorBox', react2angular(ColorBox));
}

init.init = true;
