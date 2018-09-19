import { isNull, isUndefined } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import { react2angular } from 'react2angular';
import { DateInput } from './DateInput.jsx';
import { DateRangeInput } from './DateRangeInput.jsx';
import { DateTimeInput } from './DateTimeInput.jsx';
import { DateTimeRangeInput } from './DateTimeRangeInput.jsx';
import { QueryBasedParameterInput } from './QueryBasedParameterInput.jsx';

export function ParameterValueInput({
  type,
  value,
  onSelect,
  enumOptions,
  queryId,
  clientConfig, // eslint-disable-line react/prop-types
  Query, // eslint-disable-line react/prop-types
}) {
  enumOptions = enumOptions.split('\n');

  return (
    <span>
      {
        (type === 'datetime-with-seconds') &&
        <DateTimeInput
          value={value}
          onSelect={onSelect}
          withSeconds
          clientConfig={clientConfig}
        />
      }
      {
        (type === 'datetime-local') &&
        <DateTimeInput
          value={value}
          onSelect={onSelect}
          clientConfig={clientConfig}
        />
      }
      {
        (type === 'date') &&
        <DateInput
          value={value}
          onSelect={onSelect}
          clientConfig={clientConfig}
        />
      }
      {
        (type === 'datetime-range-with-seconds') &&
        <DateTimeRangeInput
          value={value}
          onSelect={onSelect}
          withSeconds
          clientConfig={clientConfig}
        />
      }
      {
        (type === 'datetime-range') &&
        <DateTimeRangeInput
          value={value}
          onSelect={onSelect}
          clientConfig={clientConfig}
        />
      }
      {
        (type === 'date-range') &&
        <DateRangeInput
          value={value}
          onSelect={onSelect}
          clientConfig={clientConfig}
        />
      }
      {
        (type === 'enum') &&
        <select
          className="form-control"
          value={isNull(value) || isUndefined(value) ? '' : value}
          onChange={event => onSelect(event.target.value)}
        >
          {enumOptions.map(option => (
            <option value={option} key={option}>{ option }</option>
          ))}
        </select>
      }
      {
        (type === 'query') &&
        <QueryBasedParameterInput
          value={value}
          queryId={queryId}
          onSelect={onSelect}
          Query={Query}
        />
      }
      {
        ((type === 'text') || (type === 'number')) &&
        <input
          type={type}
          className="form-control"
          value={isNull(value) || isUndefined(value) ? '' : value}
          onChange={event => onSelect(event.target.value)}
        />
      }
    </span>
  );
}

ParameterValueInput.propTypes = {
  type: PropTypes.string,
  value: PropTypes.any, // eslint-disable-line react/forbid-prop-types
  enumOptions: PropTypes.string,
  queryId: PropTypes.number,
  onSelect: PropTypes.func,
};

ParameterValueInput.defaultProps = {
  type: 'text',
  value: null,
  enumOptions: '',
  queryId: null,
  onSelect: () => {},
};

export default function init(ngModule) {
  ngModule.component('parameterValueInput', {
    template: `
      <parameter-value-input-impl 
        type="$ctrl.param.type"       
        value="$ctrl.param.normalizedValue"       
        enum-options="$ctrl.param.enumOptions"       
        query-id="$ctrl.param.queryId"
        on-select="$ctrl.setValue"       
      ></parameter-value-input-impl>
    `,
    bindings: {
      param: '<',
    },
    controller($scope) {
      this.setValue = (value) => {
        this.param.setValue(value);
        $scope.$applyAsync();
      };
    },
  });
  ngModule.component(
    'parameterValueInputImpl',
    react2angular(ParameterValueInput, null, ['clientConfig', 'Query']),
  );
}
