import React, { useState, useEffect } from 'react';
import { find, pick, map, mapValues } from 'lodash';
import PivotTableUI from 'react-pivottable/PivotTableUI';
import { RendererPropTypes } from '@/visualizations';
import { formatColumnValue } from '@/filters';

import 'react-pivottable/pivottable.css';
import './renderer.less';

const VALID_OPTIONS = [
  'data',
  'rows',
  'cols',
  'vals',
  'aggregatorName',
  'valueFilter',
  'sorters',
  'rowOrder',
  'colOrder',
  'derivedAttributes',
  'rendererName',
  'hiddenAttributes',
  'hiddenFromAggregators',
  'hiddenFromDragDrop',
  'menuLimit',
  'unusedOrientationCutoff',
];

function formatRows({ rows, columns }) {
  return map(rows, row => mapValues(row, (value, key) => formatColumnValue(value, find(columns, { name: key }).type)));
}

export default function Renderer({ data, options, onOptionsChange }) {
  const [config, setConfig] = useState({ data: formatRows(data), ...options });

  useEffect(() => {
    setConfig({ data: formatRows(data), ...options });
  }, [data]);

  const onChange = (updatedOptions) => {
    const validOptions = pick(updatedOptions, VALID_OPTIONS);
    setConfig(validOptions);
    onOptionsChange(validOptions);
  };

  return (
    <div className="pivot-table-renderer">
      <PivotTableUI {...pick(config, VALID_OPTIONS)} onChange={onChange} />
    </div>
  );
}

Renderer.propTypes = RendererPropTypes;
Renderer.defaultProps = { onOptionsChange: () => {} };
