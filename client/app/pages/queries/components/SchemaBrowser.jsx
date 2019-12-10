import { isNil, map } from 'lodash';
import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';

const SchemaItemType = PropTypes.shape({
  name: PropTypes.string.isRequired,
  size: PropTypes.number,
  columns: PropTypes.arrayOf(PropTypes.string).isRequired,
});

function SchemaItem({ item, onSelect }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSelect = useCallback((event, ...args) => {
    event.preventDefault();
    event.stopPropagation();
    onSelect(...args);
  }, [onSelect]);

  return (
    <div>
      <div className="table-name" onClick={() => setIsExpanded(!isExpanded)}>
        <i className="fa fa-table m-r-5" />
        <strong>
          <span title="{{table.name}}">{item.name}</span>
          {!isNil(item.size) && (<span> ({item.size})</span>)}
        </strong>
        <i className="fa fa-angle-double-right copy-to-editor" aria-hidden="true" onClick={e => handleSelect(e, item.name)} />
      </div>
      {isExpanded && (
        <div>
          {map(item.columns, column => (
            <div key={column} className="table-open">
              {column}
              <i className="fa fa-angle-double-right copy-to-editor" aria-hidden="true" onClick={e => handleSelect(e, column)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

SchemaItem.propTypes = {
  item: SchemaItemType.isRequired,
  onSelect: PropTypes.func,
};

SchemaItem.defaultProps = {
  onSelect: () => {},
};

export default function SchemaBrowser({ schema, ...props }) {
  if (schema.length === 0) {
    return null;
  }

  return (
    <div className="schema-container" {...props}>
      <div className="schema-control" />
      <div className="schema-browser">
        {map(schema, item => <SchemaItem key={item.name} item={item} />)}
      </div>
    </div>
  );
}

SchemaBrowser.propTypes = {
  schema: PropTypes.arrayOf(SchemaItemType),
  // onRefresh: PropTypes.func,
};

SchemaBrowser.defaultProps = {
  schema: [],
  // onRefresh: () => {},
};
