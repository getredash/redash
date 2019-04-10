import React from 'react';
import PropTypes from 'prop-types';


export default function QueryResultsLink(props) {
  const extraProps = {};

  if (
    props.queryResult.getData && props.queryResult.getData() &&
    props.query.name && props.queryResult.getId &&
    props.queryResult.getId() != null
  ) {
    const fileType = props.fileType ? props.fileType : 'csv';

    if (props.query.id) {
      extraProps.href = `api/queries/${props.query.id}/results/${props.queryResult.getId()}.${fileType}${
        props.embed ? `?api_key=${props.apiKey}` : ''
      }`;
    } else {
      extraProps.href = `api/query_results/${props.queryResult.getId()}.${fileType}`;
    }
  }

  return (
    <a
      target={props.target}
      disabled={props.disabled}
      {...extraProps}
    >
      {props.children}
    </a>
  );
}

QueryResultsLink.propTypes = {
  query: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  queryResult: PropTypes.object, // eslint-disable-line react/forbid-prop-types
  fileType: PropTypes.string,
  target: PropTypes.string.isRequired,
  disabled: PropTypes.bool.isRequired,
  embed: PropTypes.bool,
  apiKey: PropTypes.string,
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node,
  ]).isRequired,
};

QueryResultsLink.defaultProps = {
  queryResult: {},
  fileType: '',
  embed: false,
  apiKey: '',
};
