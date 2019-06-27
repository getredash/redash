import React from 'react';
import PropTypes from 'prop-types';
import { isFunction, get } from 'lodash';
import Dropdown from 'antd/lib/dropdown';
import Icon from 'antd/lib/icon';
import Menu from 'antd/lib/menu';

import './DynamicButton.less';

export default function DynamicButton({ options, onSelect, enabled }) {
  const menu = (
    <Menu
      className="dynamic-menu"
      onClick={({ key }) => onSelect(get(options, key))}
    >
      {options.map((option, index) => (
        // eslint-disable-next-line react/no-array-index-key
        <Menu.Item key={index}>
          {option.name} {option.label && (
            <em>{isFunction(option.label) ? option.label() : option.label}</em>
          )}
        </Menu.Item>
      ))}
    </Menu>
  );

  return (
    <a onClick={e => e.stopPropagation()}>
      <Dropdown.Button
        overlay={menu}
        className="dynamic-button"
        placement="bottomRight"
        trigger={['click']}
        icon={(
          <Icon
            type="thunderbolt"
            theme={enabled ? 'filled' : 'outlined'}
            className="dynamic-icon"
          />
        )}
      />
    </a>
  );
}

DynamicButton.propTypes = {
  options: PropTypes.arrayOf(PropTypes.object), // eslint-disable-line react/forbid-prop-types
  onSelect: PropTypes.func,
  enabled: PropTypes.bool,
};

DynamicButton.defaultProps = {
  options: [],
  onSelect: () => {},
  enabled: false,
};
