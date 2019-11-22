import React from 'react';
import PropTypes from 'prop-types';
import Popover from 'antd/lib/popover';
import Icon from 'antd/lib/icon';
import HelpTrigger from '@/components/HelpTrigger';

import './context-help.less';

export default function ContextHelp({ icon, children, ...props }) {
  return (
    <Popover {...props} content={children}>{icon || ContextHelp.defaultIcon}</Popover>
  );
}

ContextHelp.propTypes = {
  icon: PropTypes.node,
  children: PropTypes.node,
};

ContextHelp.defaultProps = {
  icon: null,
  children: null,
};

ContextHelp.defaultIcon = (
  <Icon className="m-l-5 m-r-5" type="question-circle" theme="filled" />
);

function NumberFormatSpecs(props) {
  return (
    <ContextHelp {...props}>
      Format&nbsp;
      <HelpTrigger type="NUMBER_FORMAT_SPECS" className="visualization-editor-context-help" showTooltip={false}>specs.</HelpTrigger>
    </ContextHelp>
  );
}

function DateTimeFormatSpecs(props) {
  return (
    <ContextHelp {...props}>
      Format&nbsp;
      <a href="https://momentjs.com/docs/#/displaying/format/" target="_blank" rel="noopener noreferrer">specs.</a>
    </ContextHelp>
  );
}

ContextHelp.NumberFormatSpecs = NumberFormatSpecs;
ContextHelp.DateTimeFormatSpecs = DateTimeFormatSpecs;
