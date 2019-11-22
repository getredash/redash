import React from 'react';
import PropTypes from 'prop-types';
import Popover from 'antd/lib/popover';
import Icon from 'antd/lib/icon';

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

function NumberFormatSpecs() {
  return (
    <ContextHelp>
      <React.Fragment>
        Format&nbsp;
        <a href="https://redash.io/help/user-guide/visualizations/formatting-numbers" target="_blank" rel="noopener noreferrer">specs.</a>
      </React.Fragment>
    </ContextHelp>
  );
}

function DateTimeFormatSpecs() {
  return (
    <ContextHelp>
      <React.Fragment>
        Format&nbsp;
        <a href="https://momentjs.com/docs/#/displaying/format/" target="_blank" rel="noopener noreferrer">specs.</a>
      </React.Fragment>
    </ContextHelp>
  );
}

ContextHelp.NumberFormatSpecs = NumberFormatSpecs;
ContextHelp.DateTimeFormatSpecs = DateTimeFormatSpecs;
