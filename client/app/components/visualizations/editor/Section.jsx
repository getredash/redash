import React from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';

export default function Section({ className, ...props }) {
  return (
    <div className={cx('m-b-15', className)} {...props} />
  );
}

Section.propTypes = {
  className: PropTypes.string,
};

Section.defaultProps = {
  className: null,
};
