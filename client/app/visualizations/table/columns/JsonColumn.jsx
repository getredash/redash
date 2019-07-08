import { isString, isUndefined } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import JsonViewInteractive from '@/components/json-view-interactive/JsonViewInteractive';
import { clientConfig } from '@/services/auth';

function parseValue(value) {
  if (isString(value) && (value.length <= clientConfig.tableCellMaxJSONSize)) {
    try {
      return JSON.parse(value);
    } catch (e) {
      return undefined;
    }
  }
}

export default function JsonColumn({ column, row }) {
  const value = row[column.name];

  const parsedValue = parseValue(value, clientConfig);
  if (isUndefined(parsedValue)) {
    return <div className="json-cell-invalid">{'' + value}</div>;
  }

  return (
    <div className="json-cell-valid">
      <JsonViewInteractive value={parsedValue} />
    </div>
  );
}

JsonColumn.propTypes = {
  column: PropTypes.shape({
    name: PropTypes.string.isRequired,
  }).isRequired,
  row: PropTypes.object, // eslint-disable-line react/forbid-prop-types
};

JsonColumn.defaultProps = {
  row: {},
};
