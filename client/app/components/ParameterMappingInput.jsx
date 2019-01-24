/* eslint react/no-multi-comp: 0 */

import { extend, map, includes, findIndex, find, fromPairs, clone } from 'lodash';
import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import Select from 'antd/lib/select';
import Table from 'antd/lib/table';
import Popover from 'antd/lib/popover';
import Button from 'antd/lib/button';
import Icon from 'antd/lib/icon';
import Tag from 'antd/lib/tag';
import Input from 'antd/lib/input';
import { ParameterValueInput } from '@/components/ParameterValueInput';
import { ParameterMappingType } from '@/services/widget';
import { Parameter } from '@/services/query';

import './ParameterMappingInput.less';

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
          value={mapping.type}
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
        { alreadyExists && (
          <div className="help-block">
            Dashboard parameter with this name already exists
          </div>
        )}
      </div>
    );
  }

  renderDashboardMapToExisting() {
    const { mapping, existingParamNames } = this.props;
    return (
      <div className="m-t-10">
        <Select
          className="w-100"
          value={mapping.mapTo}
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
        <label htmlFor="parameter-value-input">Change parameter value:</label>
        <ParameterValueInput
          id="parameter-value-input"
          className="w-100"
          type={mapping.param.type}
          value={mapping.param.normalizedValue}
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

  render() {
    const { mapping } = this.props;
    return (
      <div key={mapping.name}>
        {this.renderMappingTypeSelector()}
        {this.renderInputBlock()}
      </div>
    );
  }
}

class EditMapping extends React.Component {
  static propTypes = {
    mapping: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
    existingParamNames: PropTypes.arrayOf(PropTypes.string).isRequired,
    onChange: PropTypes.func.isRequired,
    getContainerElement: PropTypes.func.isRequired,
    clientConfig: PropTypes.any, // eslint-disable-line react/forbid-prop-types
    Query: PropTypes.any, // eslint-disable-line react/forbid-prop-types
  };

  static defaultProps = {
    clientConfig: null,
    Query: null,
  }

  constructor(props) {
    super(props);
    this.state = {
      visible: false,
      mapping: clone(this.props.mapping),
    };
  }

  onVisibleChange = (visible) => {
    if (visible) this.show(); else this.hide();
  }

  onChange = (mapping) => {
    this.setState({ mapping });
  }

  get content() {
    const { mapping } = this.state;
    const { clientConfig, Query } = this.props;

    return (
      <div className="editMapping">
        <header>Edit parameter</header>
        <ParameterMappingInput
          mapping={mapping}
          existingParamNames={this.props.existingParamNames}
          onChange={this.onChange}
          getContainerElement={() => this.wrapperRef.current}
          clientConfig={clientConfig}
          Query={Query}
        />
        <footer>
          <Button onClick={this.hide}>Cancel</Button>
          <Button onClick={this.save} type="primary">OK</Button>
        </footer>
      </div>
    );
  }

  save = () => {
    this.props.onChange(this.props.mapping, this.state.mapping);
    this.hide();
  }

  show = () => {
    this.setState({
      visible: true,
      mapping: clone(this.props.mapping), // restore original state
    });
  }

  hide = () => {
    this.setState({ visible: false });
  }

  render() {
    return (
      <Popover
        placement="left"
        trigger="click"
        content={this.content}
        visible={this.state.visible}
        onVisibleChange={this.onVisibleChange}
        getPopupContainer={this.props.getContainerElement}
      >
        <Button size="small" type="dashed">
          <Icon type="edit" />
        </Button>
      </Popover>
    );
  }
}

class EditTitle extends React.Component {
  static propTypes = {
    mapping: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
    onChange: PropTypes.func.isRequired,
    getContainerElement: PropTypes.func.isRequired,
  };

  state = {
    visible: false,
    title: this.props.mapping.title,
  }

  onVisibleChange = (visible) => {
    this.setState({
      visible,
      title: this.props.mapping.title, // reset title
    });
  }

  onTitleChange = (event) => {
    this.setState({ title: event.target.value });
  }

  get popover() {
    const { param: { title: paramTitle } } = this.props.mapping;

    return (
      <div className="editTitle">
        <Input
          size="small"
          value={this.state.title}
          placeholder={paramTitle}
          onChange={this.onTitleChange}
          onPressEnter={this.save}
          autoFocus
        />
        <Button size="small" type="dashed" onClick={this.hide}>
          <Icon type="close" />
        </Button>
        <Button size="small" type="dashed" onClick={this.save}>
          <Icon type="check" />
        </Button>
      </div>
    );
  }

  save = () => {
    const newMapping = extend({}, this.props.mapping, { title: this.state.title });
    this.props.onChange(newMapping);
    this.hide();
  }

  hide = () => {
    this.setState({ visible: false });
  }

  render() {
    return (
      <Popover
        placement="right"
        trigger="click"
        content={this.popover}
        visible={this.state.visible}
        onVisibleChange={this.onVisibleChange}
        getPopupContainer={this.props.getContainerElement}
      >
        <Button size="small" type="dashed">
          <Icon type="edit" />
        </Button>
      </Popover>
    );
  }
}

export class ParameterMappingListInput extends React.Component {
  static propTypes = {
    mappings: PropTypes.arrayOf(PropTypes.object),
    existingParams: PropTypes.arrayOf(PropTypes.shape({
      name: PropTypes.string,
      type: PropTypes.string,
    })),
    onChange: PropTypes.func,
    clientConfig: PropTypes.any, // eslint-disable-line react/forbid-prop-types
    Query: PropTypes.any, // eslint-disable-line react/forbid-prop-types
  };

  static defaultProps = {
    mappings: [],
    existingParams: [],
    onChange: () => {},
    clientConfig: null,
    Query: null,
  };

  constructor(props) {
    super(props);
    this.wrapperRef = React.createRef();
  }

  static getStringValue(value) {
    // null
    if (!value) {
      return '';
    }

    // range
    if (value instanceof Object && 'start' in value && 'end' in value) {
      return `${value.start} ~ ${value.end}`;
    }

    // just to be safe, array or object
    if (typeof value === 'object') {
      return map(value, v => this.getStringValue(v)).join(', ');
    }

    // rest
    return value.toString();
  }

  static getDefaultValue(mapping, existingParams) {
    const { type, mapTo, name } = mapping;
    let { param } = mapping;

    // if mapped to another param, swap 'em
    if (type === MappingType.DashboardMapToExisting && mapTo !== name) {
      const mappedTo = find(existingParams, { name: mapTo });
      if (mappedTo) { // just being safe
        param = mappedTo;
      }

    // static type is different since it's fed param.normalizedValue
    } else if (type === MappingType.StaticValue) {
      param = param.clone().setValue(mapping.value);
    }

    const value = Parameter.getValue(param);
    return this.getStringValue(value);
  }

  static getSourceTypeLabel({ type, mapTo }) {
    switch (type) {
      case MappingType.DashboardAddNew:
      case MappingType.DashboardMapToExisting:
        return (
          <Fragment>
            Dashboard parameter{' '}
            <Tag className="tag">{mapTo}</Tag>
          </Fragment>
        );
      case MappingType.WidgetLevel:
        return 'Widget parameter';
      case MappingType.StaticValue:
        return 'Static value';
      default:
        return ''; // won't happen (typescript-ftw)
    }
  }

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
    const { clientConfig, Query, existingParams } = this.props; // eslint-disable-line react/prop-types
    const dataSource = this.props.mappings.map(mapping => ({ mapping }));

    return (
      <div ref={this.wrapperRef} className="paramMappingList">
        <Table
          dataSource={dataSource}
          size="middle"
          pagination={false}
          rowKey={(record, idx) => `row${idx}`}
        >
          <Table.Column
            title="Title"
            dataIndex="mapping"
            key="title"
            render={(mapping) => {
              const { title, param: { title: paramTitle } } = mapping;
              return (
                <Fragment>
                  {title || paramTitle}{' '}
                  <EditTitle
                    mapping={mapping}
                    onChange={newMapping => this.updateParamMapping(mapping, newMapping)}
                    getContainerElement={() => this.wrapperRef.current}
                  />
                </Fragment>
              );
            }}
          />
          <Table.Column
            title="Keyword"
            dataIndex="mapping"
            key="keyword"
            className="keyword"
            render={mapping => <code>{`{{ ${mapping.name} }}`}</code>}
          />
          <Table.Column
            title="Default Value"
            dataIndex="mapping"
            key="value"
            render={mapping => (
              this.constructor.getDefaultValue(mapping, this.props.existingParams)
            )}
          />
          <Table.Column
            title="Value Source"
            dataIndex="mapping"
            key="source"
            render={(mapping) => {
              const existingParamsNames = existingParams
                .filter(({ type }) => type === mapping.param.type) // exclude mismatching param types
                .map(({ name }) => name); // keep names only

              return (
                <Fragment>
                  {this.constructor.getSourceTypeLabel(mapping)}{' '}
                  <EditMapping
                    mapping={mapping}
                    existingParamNames={existingParamsNames}
                    onChange={(oldMapping, newMapping) => this.updateParamMapping(oldMapping, newMapping)}
                    getContainerElement={() => this.wrapperRef.current}
                    clientConfig={clientConfig}
                    Query={Query}
                  />
                </Fragment>
              );
            }}
          />
        </Table>
      </div>
    );
  }
}
