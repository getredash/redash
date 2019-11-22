import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import AntSwitch from 'antd/lib/switch';

export default function Switch({ id, children, ...props }) {
  const fallbackId = useMemo(() => `visualization-editor-control-${Math.random().toString(36).substr(2, 10)}`, []);
  id = id || fallbackId;

  if (children) {
    return (
      <label htmlFor={id} className="d-flex align-items-center">
        <AntSwitch id={id} {...props} />
        <span className="m-l-10 m-r-10">{children}</span>
      </label>
    );
  }

  return (
    <AntSwitch {...props} />
  );
}

Switch.propTypes = {
  id: PropTypes.string,
  children: PropTypes.node,
};

Switch.defaultProps = {
  id: null,
  children: null,
};
