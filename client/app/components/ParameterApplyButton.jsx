import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { react2angular } from 'react2angular';
import Button from 'antd/lib/button';
import Badge from 'antd/lib/badge';

export function ParameterApplyButton({ paramCount, onClick }) {
  const [isApplying, setIsApplying] = useState();

  // show spinner when applying (also when paramCount is empty so the fade out is consistent)
  const icon = isApplying || !paramCount ? 'spinner fa-pulse' : 'check';

  const _onClick = () => {
    setIsApplying(true);
    onClick();
  };

  // reset isApplying when count changes
  useEffect(() => {
    setIsApplying(false);
  }, [paramCount]);

  return (
    <div className="parameter-apply-button" data-show={!!paramCount} data-test="ParameterApplyButton">
      <Badge count={paramCount}>
        <Button onClick={_onClick}>
          <i className={`fa fa-${icon}`} /> Apply Changes
        </Button>
      </Badge>
    </div>
  );
}

ParameterApplyButton.propTypes = {
  onClick: PropTypes.func.isRequired,
  paramCount: PropTypes.number,
};

ParameterApplyButton.defaultProps = {
  paramCount: 0,
};

export default function init(ngModule) {
  ngModule.component('parameterApplyButton', react2angular(ParameterApplyButton));
}

init.init = true;
