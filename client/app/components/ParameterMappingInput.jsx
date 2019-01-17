/* eslint react/no-multi-comp: 0 */

import { extend, map, includes, findIndex, find, fromPairs, isNull, isUndefined } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import Select from 'antd/lib/select';
import { ParameterValueInput } from '@/components/ParameterValueInput';
import { ParameterMappingType } from '@/services/widget';

const { Option } = Select;

export const MappingType = {
  DashboardAddNew: 'dashboard-add-new',
  DashboardMapToExisting: 'dashboard-map-to-existing',
  WidgetLevel: 'widget-level',
  StaticValue: 'static-value',
};

export function parameterMappingsToEditableMappings(mappings, parameters, existingParameterNames = []) {
  return map(mappings, (mapping) => {
    const result = extend({}, mapping);
    const alreadyExists = includes(existingParameterNames, mapping.mapTo);
    result.param = find(parameters, p => p.name === mapping.name);
    switch (mapping.type) {
      case ParameterMappingType.DashboardLevel:
        result.type = alreadyExists ? MappingType.DashboardMapToExisting : MappingType.DashboardAddNew;
        result.value = null;
        break;
      case ParameterMappingType.StaticValue:
        result.type = MappingType.StaticValue;
        result.param = result.param.clone();
        result.param.setValue(result.value);
        break;
      case ParameterMappingType.WidgetLevel:
        result.type = MappingType.WidgetLevel;
        result.value = null;
        break;
      // no default
    }
    return result;
  });
}

export function editableMappingsToParameterMappings(mappings) {
  return fromPairs(map( // convert to map
    mappings,
    (mapping) => {
      const result = extend({}, mapping);
      switch (mapping.type) {
        case MappingType.DashboardAddNew:
          result.type = ParameterMappingType.DashboardLevel;
          result.value = null;
          break;
        case MappingType.DashboardMapToExisting:
          result.type = ParameterMappingType.DashboardLevel;
          result.value = null;
          break;
        case MappingType.StaticValue:
          result.type = ParameterMappingType.StaticValue;
          result.param = mapping.param.clone();
          result.param.setValue(result.value);
          result.value = result.param.value;
          break;
        case MappingType.WidgetLevel:
          result.type = ParameterMappingType.WidgetLevel;
          result.value = null;
          break;
        // no default
      }
      delete result.param;
      return [result.name, result];
    },
  ));
}

export class ParameterMappingInput extends React.Component {
  static propTypes = {
    mapping: PropTypes.object, // eslint-disable-line react/forbid-prop-types
    existingParamNames: PropTypes.arrayOf(PropTypes.string),
    onChange: PropTypes.func,
    clientConfig: PropTypes.any, // eslint-disable-line react/forbid-prop-types
    Query: PropTypes.any, // eslint-disable-line react/forbid-prop-types
  };

  static defaultProps = {
    mapping: {},
    existingParamNames: [],
    onChange: () => {},
    clientConfig: null,
    Query: null,
  };

  updateParamMapping(mapping, updates) {
    this.props.onChange(extend({}, mapping, updates));
  }

  renderMappingTypeSelector() {
    const { mapping, existingParamNames } = this.props;
    return (
      <div>
        <Select
          className="w-100"
          defaultValue={mapping.type}
          onChange={type => this.updateParamMapping(mapping, { type })}
          dropdownClassName="ant-dropdown-in-bootstrap-modal"
        >
          <Option value={MappingType.DashboardAddNew}>Add the parameter to the dashboard</Option>
          {
            (existingParamNames.length > 0) &&
            <Option value={MappingType.DashboardMapToExisting}>Map to existing parameter</Option>
          }
          <Option value={MappingType.StaticValue}>Use static value for the parameter</Option>
          <Option value={MappingType.WidgetLevel}>Keep the parameter at the widget level</Option>
        </Select>
      </div>
    );
  }

  renderDashboardAddNew() {
    const { mapping, existingParamNames } = this.props;
    const alreadyExists = includes(existingParamNames, mapping.mapTo);
    return (
      <div className={'m-t-10' + (alreadyExists ? ' has-error' : '')}>
        <input
          type="text"
          className="form-control"
          value={mapping.mapTo}
          onChange={event => this.updateParamMapping(mapping, { mapTo: event.target.value })}
        />
        { alreadyExists &&
        <div className="help-block">
          Dashboard parameter with this name already exists
        </div>
        }
      </div>
    );
  }

  renderDashboardMapToExisting() {
    const { mapping, existingParamNames } = this.props;
    return (
      <div className="m-t-10">
        <Select
          className="w-100"
          defaultValue={mapping.mapTo}
          onChange={mapTo => this.updateParamMapping(mapping, { mapTo })}
          disabled={existingParamNames.length === 0}
          dropdownClassName="ant-dropdown-in-bootstrap-modal"
        >
          {map(existingParamNames, name => (
            <Option value={name} key={name}>{ name }</Option>
          ))}
        </Select>
      </div>
    );
  }

  renderStaticValue() {
    const { mapping } = this.props;
    return (
      <div className="m-t-10">
        <label>Change parameter value:</label>
        <ParameterValueInput
          className="w-100"
          type={mapping.param.type}
          value={isUndefined(mapping.value) || isNull(mapping.value) ? mapping.param.normalizedValue : mapping.value}
          enumOptions={mapping.param.enumOptions}
          queryId={mapping.param.queryId}
          onSelect={value => this.updateParamMapping(mapping, { value })}
          clientConfig={this.props.clientConfig}
          Query={this.props.Query}
        />
      </div>
    );
  }

  renderInputBlock() {
    const { mapping } = this.props;
    switch (mapping.type) {
      case MappingType.DashboardAddNew: return this.renderDashboardAddNew();
      case MappingType.DashboardMapToExisting: return this.renderDashboardMapToExisting();
      case MappingType.StaticValue: return this.renderStaticValue();
      // no default
    }
  }

  renderTitleInput() {
    const { mapping } = this.props;
    if (mapping.type === MappingType.StaticValue) {
      return null;
    }
    return (
      <div className="m-t-10">
        <label>Change parameter title (leave empty to use existing):</label>
        <input
          type="text"
          className="form-control"
          value={mapping.title}
          onChange={event => this.updateParamMapping(mapping, { title: event.target.value })}
          placeholder={mapping.param.title}
        />
      </div>
    );
  }

  render() {
    const { mapping } = this.props;
    return (
      <div key={mapping.name} className="row">
        <div className="col-xs-5">
          <div className="form-control-static">{'{{ ' + mapping.name + ' }}'}</div>
        </div>
        <div className="col-xs-7">
          {this.renderMappingTypeSelector()}
          {this.renderInputBlock()}
          {this.renderTitleInput()}
        </div>
      </div>
    );
  }
}

export class ParameterMappingListInput extends React.Component {
  static propTypes = {
    mappings: PropTypes.arrayOf(PropTypes.object),
    existingParamNames: PropTypes.arrayOf(PropTypes.string),
    onChange: PropTypes.func,
    clientConfig: PropTypes.any, // eslint-disable-line react/forbid-prop-types
    Query: PropTypes.any, // eslint-disable-line react/forbid-prop-types
  };

  static defaultProps = {
    mappings: [],
    existingParamNames: [],
    onChange: () => {},
    clientConfig: null,
    Query: null,
  };

  updateParamMapping(oldMapping, newMapping) {
    const mappings = [...this.props.mappings];
    const index = findIndex(mappings, oldMapping);
    if (index >= 0) {
      // This should be the only possible case, but need to handle `else` too
      mappings[index] = newMapping;
    } else {
      mappings.push(newMapping);
    }
    this.props.onChange(mappings);
  }

  render() {
    const clientConfig = this.props.clientConfig; // eslint-disable-line react/prop-types
    const Query = this.props.Query; // eslint-disable-line react/prop-types

    return (
      <div>
        {this.props.mappings.map((mapping, index) => (
          <div key={mapping.name} className={(index === 0 ? '' : ' m-t-15')}>
            <ParameterMappingInput
              mapping={mapping}
              existingParamNames={this.props.existingParamNames}
              onChange={newMapping => this.updateParamMapping(mapping, newMapping)}
              clientConfig={clientConfig}
              Query={Query}
            />
          </div>
        ))}
      </div>
    );
  }
}
