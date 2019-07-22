import React from 'react';
import PropTypes from 'prop-types';
import { react2angular } from 'react2angular';
import Button from 'antd/lib/button';
import Badge from 'antd/lib/badge';
import Tooltip from 'antd/lib/tooltip';
import { KeyboardShortcuts } from '@/services/keyboard-shortcuts';

export function ParameterApplyButton({ paramCount, onClick, isApplying }) {
  // show spinner when applying (also when count is empty so the fade out is consistent)
  const icon = isApplying || !paramCount ? 'spinner fa-pulse' : 'check';

  return (
    <div className="parameter-apply-button" data-show={!!paramCount} data-test="ParameterApplyButton">
      <Badge count={paramCount}>
        <Tooltip title={`${KeyboardShortcuts.modKey} + Enter`}>
          <span>
            <Button onClick={onClick}>
              <i className={`fa fa-${icon}`} /> Apply Changes
            </Button>
          </span>
        </Tooltip>
      </Badge>
    </div>
  );
}

ParameterApplyButton.propTypes = {
  onClick: PropTypes.func.isRequired,
  paramCount: PropTypes.number.isRequired,
  isApplying: PropTypes.bool.isRequired,
};

export default function init(ngModule) {
  ngModule.component('parameterApplyButton', react2angular(ParameterApplyButton));
}

init.init = true;
