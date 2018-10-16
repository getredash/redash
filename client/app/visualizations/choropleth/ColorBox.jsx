import React from 'react';
import PropTypes from 'prop-types';

export default function ColorBox(props) {
  return (
    <span style={{
      width: 12,
      height: 12,
      backgroundColor: props.color,
      display: 'inline-block',
      marginRight: 5,
      }}
    />);
}

ColorBox.propTypes = { color: PropTypes.string.isRequired };
