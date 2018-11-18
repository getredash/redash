import React from 'react';
import Tooltip from 'antd/lib/tooltip';
import PropTypes from 'prop-types';
import { react2angular } from 'react2angular';

export function AutocompleteToggle({ state, disabled, onToggle }) {
  let tooltipMessage = 'Live Autocomplete Enabled';
  if (!state || disabled) {
    tooltipMessage = 'Live Autocomplete Disabled';
  }

  return (
    <Tooltip placement="top" title={tooltipMessage}>
      <button
        type="button"
        className={'btn btn-default m-r-5' + (state ? ' active' : '') + (disabled ? ' disabled' : '')}
        onClick={() => onToggle(!state)}
        disabled={disabled}
      >
        <span className="fa fa-flash" />
      </button>
    </Tooltip>
  );
}

AutocompleteToggle.propTypes = {
  state: PropTypes.bool.isRequired,
  disabled: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
};

export default function init(ngModule) {
  ngModule.component('autoCompleteToggle', react2angular(AutocompleteToggle));
}
