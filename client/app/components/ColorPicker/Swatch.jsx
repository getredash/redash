import React from 'react';
import PropTypes from 'prop-types';

import './swatch.less';

export default function Swatch({ className, color, size, ...props }) {
  return (
    <span
      className={`color-swatch ${className}`}
      style={{ backgroundColor: color, width: size }}
      {...props}
    />
  );
}

Swatch.propTypes = {
  className: PropTypes.string,
  color: PropTypes.string,
  size: PropTypes.number,
};

Swatch.defaultProps = {
  className: '',
  color: 'transparent',
  size: 12,
};
