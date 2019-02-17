import React from 'react';
import Tooltip from 'antd/lib/tooltip';
import PropTypes from 'prop-types';
import '@/redash-font/style.less';
import recordEvent from '@/services/recordEvent';

export default function AutocompleteToggle({ state, disabled, onToggle }) {
  let tooltipMessage = 'Live Autocomplete Enabled';
  let icon = 'icon-flash';
  if (!state) {
    tooltipMessage = 'Live Autocomplete Disabled';
    icon = 'icon-flash-off';
  }

  if (disabled) {
    tooltipMessage = 'Live Autocomplete Not Available (Use Ctrl+Space to Trigger)';
    icon = 'icon-flash-off';
  }

  const toggle = (newState) => {
    recordEvent('toggle_autocomplete', 'screen', 'query_editor', { state: newState });
    onToggle(newState);
  };

  return (
    <Tooltip placement="top" title={tooltipMessage}>
      <button
        type="button"
        className={'btn btn-default m-r-5' + (disabled ? ' disabled' : '')}
        onClick={() => toggle(!state)}
        disabled={disabled}
      >
        <i className={'icon ' + icon} />
      </button>
    </Tooltip>
  );
}

AutocompleteToggle.propTypes = {
  state: PropTypes.bool.isRequired,
  disabled: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
};
