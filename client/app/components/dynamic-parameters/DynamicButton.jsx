import React from 'react';
import PropTypes from 'prop-types';
import { isFunction, get, findIndex } from 'lodash';
import Dropdown from 'antd/lib/dropdown';
import Icon from 'antd/lib/icon';
import Menu from 'antd/lib/menu';
import Typography from 'antd/lib/typography';

import './DynamicButton.less';

const { Text } = Typography;

export default function DynamicButton({ options, selectedDynamicValue, onSelect, enabled }) {
  const menu = (
    <Menu
      className="dynamic-menu"
      onClick={({ key }) => onSelect(get(options, key, 'static'))}
      selectedKeys={[`${findIndex(options, { value: selectedDynamicValue })}`]}
    >
      {options.map((option, index) => (
        // eslint-disable-next-line react/no-array-index-key
        <Menu.Item key={index}>
          {option.name} {option.label && (
            <em>{isFunction(option.label) ? option.label() : option.label}</em>
          )}
        </Menu.Item>
      ))}
      {enabled && <Menu.Divider />}
      {enabled && (
        <Menu.Item>
          <i className="fa fa-arrow-left" /> <Text type="secondary">Back to Static Value</Text>
        </Menu.Item>
      )}
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
  selectedDynamicValue: PropTypes.string,
  onSelect: PropTypes.func,
  enabled: PropTypes.bool,
};

DynamicButton.defaultProps = {
  options: [],
  selectedDynamicValue: null,
  onSelect: () => {},
  enabled: false,
};
