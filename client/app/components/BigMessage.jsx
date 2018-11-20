import React from 'react';
import PropTypes from 'prop-types';
import { react2angular } from 'react2angular';

export function BigMessage({ message, icon, children }) {
  return (
    <div className="tiled bg-white p-15 text-center">
      <h3 className="m-t-0 m-b-0">
        <i className={'fa ' + icon} />
      </h3>
      <br />
      {message}
      {children}
    </div>
  );
}

BigMessage.propTypes = {
  message: PropTypes.string,
  icon: PropTypes.string.isRequired,
  children: PropTypes.node,
};

BigMessage.defaultProps = {
  message: '',
  children: null,
};

export default function init(ngModule) {
  ngModule.component('bigMessage', react2angular(BigMessage));
}

init.init = true;
