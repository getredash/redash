import React from 'react';
import PropTypes from 'prop-types';
import Tooltip from 'antd/lib/tooltip';
import Icon from 'antd/lib/icon';

const BASE_URL = 'https://redash.io/help/user-guide/';
const TYPES = {
  VALUE_SOURCE_OPTIONS: [
    'querying/query-parameters#Value-Source-Options',
    'Value Source Options',
  ],
};

export default class HelpTrigger extends React.PureComponent {
  static propTypes = {
    type: PropTypes.oneOf(Object.keys(TYPES)).isRequired,
  }

  render() {
    const [path, tooltip] = TYPES[this.props.type];
    const href = BASE_URL + path;
    return (
      <Tooltip title={`Guide: ${tooltip}`}>
        {/* eslint-disable-next-line react/jsx-no-target-blank */}
        <a href={href} target="_blank" rel="noopener">
          <Icon type="question-circle" />
        </a>
      </Tooltip>
    );
  }
}
