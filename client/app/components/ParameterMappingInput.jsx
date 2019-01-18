/* eslint react/no-multi-comp: 0 */

import { extend, map, includes, findIndex, find, fromPairs, isEmpty, clone, without } from 'lodash';
import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import Table from 'antd/lib/table';
import Button from 'antd/lib/button';
import Select from 'antd/lib/select';
import Icon from 'antd/lib/icon';
import Popover from 'antd/lib/popover';
import Input from 'antd/lib/input';
import Radio from 'antd/lib/radio';
import { ParameterValueInput } from '@/components/ParameterValueInput';
import { ParameterMappingType } from '@/services/widget';

export const MappingType = {
  DashboardAddNew: 'dashboard-add-new',
  DashboardMapToExisting: 'dashboard-map-to-existing',
  WidgetLevel: 'widget-level',
  StaticValue: 'static-value',
};

const MappingTypeLabel = {
  [MappingType.DashboardAddNew]: 'Dashboard parameter',
  [MappingType.DashboardMapToExisting]: 'Dashboard parameter',
  [MappingType.WidgetLevel]: 'Widget parameter',
  [MappingType.StaticValue]: 'Static value',
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

class SourceInput extends React.Component {
  static propTypes = {
    mapping: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
    existingParamNames: PropTypes.arrayOf(PropTypes.string).isRequired,
    onChange: PropTypes.func.isRequired,
    getContainerElement: PropTypes.func.isRequired,
    clientConfig: PropTypes.any.isRequired, // eslint-disable-line react/forbid-prop-types
    Query: PropTypes.any.isRequired, // eslint-disable-line react/forbid-prop-types
  };

  constructor(props) {
    super(props);
    this.state = {
      editMode: false,
      mapping: clone(this.props.mapping),
    };
  }

  onVisibleChange = (visible) => {
    if (!visible) {
      this.cancel();
    } else {
      this.setState({ editMode: true });
    }
  }

  onChangeSourceType = (e) => {
    const type = e.target.value;
    this.mapping = { type };
    if (type !== MappingType.StaticValue) {
      this.mapping = { value: null }; // reset
    }
  }

  onChangeMapToParam = (value) => {
    this.mapping = {
      mapTo: value,
      type: includes(this.props.existingParamNames, value)
        ? MappingType.DashboardMapToExisting
        : MappingType.DashboardAddNew,
    };
  }

  onChangeStaticValue = (value) => {
    this.mapping = { value };
  }

  get popover() {
    const radioStyle = {
      style: {
        display: 'block',
        height: '30px',
        lineHeight: '30px',
      },
    };

    const { existingParamNames: existing } = this.props;
    const {
      name, type, mapTo, value, param,
    } = this.state.mapping;

    // TODO: this code mess is to compensate for the dashboard type having
    // 2 logical states and only 1 ui state. Should merge them
    let dashboardMappingType = MappingType.DashboardAddNew;
    if (type === MappingType.DashboardMapToExisting) {
      dashboardMappingType = MappingType.DashboardMapToExisting;
    }
    const isDashboardSelected = type === dashboardMappingType;
    const isStaticValSelected = type === MappingType.StaticValue;

    return (
      <Fragment>
        <Radio.Group onChange={this.onChangeSourceType} value={type}>
          <Radio {...radioStyle} value={dashboardMappingType} key={1}>
            Dashboard parameter {' '}
            <Select
              class="w-100"
              value={mapTo}
              onChange={this.onChangeMapToParam}
              size="small"
              style={{
                opacity: isDashboardSelected ? 1 : 0,
                pointerEvents: isDashboardSelected ? null : 'none',
              }}
              dropdownMatchSelectWidth={false}
              disabled={isEmpty(without(existing, name))}
            >
              {!includes(existing, name) ?
                <Select.Option value={name} key={name}>{name}</Select.Option>
              : null}
              {existing.map(prm => (
                <Select.Option value={prm} key={prm}>{prm}</Select.Option>
              ))}
            </Select>
          </Radio>
          <Radio {...radioStyle} value={ParameterMappingType.WidgetLevel} key={2}>
            Widget parameter
          </Radio>
          <Radio {...radioStyle} value={ParameterMappingType.StaticValue} key={3}>
            Static value
            <span style={{
              marginLeft: 4,
              opacity: isStaticValSelected ? 1 : 0,
              pointerEvents: isStaticValSelected ? null : 'none',
            }}
            >
              {console.log(param.type)}
              <ParameterValueInput
                size="small"
                type={param.type}
                value={value || param.normalizedValue}
                enumOptions={param.enumOptions}
                queryId={param.queryId}
                onSelect={this.onChangeStaticValue}
                clientConfig={this.props.clientConfig}
                Query={this.props.Query}
              />
            </span>
          </Radio>
        </Radio.Group>
        <footer style={{
         marginTop: 10, paddingTop: 10, borderTop: '1px solid #eee', textAlign: 'right',
        }}
        >
          <Button size="small" onClick={this.cancel} style={{ marginRight: 2 }}>
            Cancel
          </Button>
          <Button size="small" type="primary" onClick={this.save}>OK</Button>
        </footer>
      </Fragment>
    );
  }

  set mapping(props) {
    this.setState({
      mapping: extend(this.state.mapping, props),
    });
  }

  save = () => {
    this.props.onChange(this.state.mapping);
    this.hide();
  }

  cancel = () => {
    this.mapping = clone(this.props.mapping); // restore original state
    this.hide();
  }

  hide = () => {
    this.setState({ editMode: false });
  }

  render() {
    const { mapping, getContainerElement } = this.props;
    return (
      <span>
        {MappingTypeLabel[mapping.type]}{' '}
        <Popover
          placement="left"
          trigger="click"
          content={this.popover}
          visible={this.state.editMode}
          onVisibleChange={this.onVisibleChange}
          getPopupContainer={getContainerElement}
        >
          <Button size="small" type="dashed">
            <Icon type="edit" />
          </Button>
        </Popover>
      </span>
    );
  }
}

class TitleInput extends React.Component {
  static propTypes = {
    mapping: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
    onChange: PropTypes.func.isRequired,
    getContainerElement: PropTypes.func.isRequired,
  };

  state = {
    editMode: false,
    title: this.props.mapping.title,
  }

  onVisibleChange = (visible) => {
    this.setState({ editMode: visible });
  }

  onTitleChange = (event) => {
    this.setState({ title: event.target.value });
  }

  get popover() {
    const { param: { title: paramTitle } } = this.props.mapping;

    return (
      <Fragment>
        <Input
          size="small"
          defaultValue={this.state.title}
          placeholder={paramTitle}
          style={{ width: 100, marginRight: 3 }}
          onChange={this.onTitleChange}
          onPressEnter={this.save}
          autoFocus
        />
        <Button size="small" type="dashed" onClick={this.hide} style={{ marginRight: 2 }}>
          <Icon type="close" />
        </Button>
        <Button size="small" type="dashed" onClick={this.save}>
          <Icon type="check" />
        </Button>
      </Fragment>
    );
  }

  save = () => {
    const newMapping = extend({}, this.props.mapping, { title: this.state.title });
    this.props.onChange(newMapping);
    this.hide();
  }

  hide = () => {
    this.setState({ editMode: false });
  }

  render() {
    const { mapping } = this.props;
    const { title, param: { title: paramTitle } } = mapping;

    // if static value, return name
    if (mapping.type === MappingType.StaticValue) {
      return paramTitle;
    }

    // TODO css className
    return (
      <span style={{ whiteSpace: 'nowrap' }}>
        {title || paramTitle}
        <Popover
          placement="right"
          trigger="click"
          content={this.popover}
          visible={this.state.editMode}
          onVisibleChange={this.onVisibleChange}
          getPopupContainer={this.props.getContainerElement}
        >
          <Button
            size="small"
            type="dashed"
            style={{ marginLeft: '10px' }}
          >
            <Icon type="edit" />
          </Button>
        </Popover>
      </span>
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

  constructor(props) {
    super(props);
    this.wrapperRef = React.createRef();
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
    const clientConfig = this.props.clientConfig; // eslint-disable-line react/prop-types
    const Query = this.props.Query; // eslint-disable-line react/prop-types

    const data = this.props.mappings.map(mapping => ({ mapping }));

    return (
      <div ref={this.wrapperRef}>
        <Table dataSource={data} size="middle" pagination={false} rowKey="uid">
          <Table.Column
            title="Title"
            dataIndex="mapping"
            key="title"
            render={mapping => (
              <TitleInput
                mapping={mapping}
                onChange={newMapping => this.updateParamMapping(mapping, newMapping)}
                getContainerElement={() => this.wrapperRef.current}
              />
            )}
          />
          <Table.Column
            title="Keyword"
            dataIndex="mapping"
            key="keyword"
            render={mapping => (
              <code style={{ whiteSpace: 'nowrap' }}>
                {`{{ ${mapping.name} }}`}
              </code>
            )}
          />
          <Table.Column
            title="Default Value"
            dataIndex="mapping"
            key="value"
            render={mapping => (
              mapping.value || mapping.param.normalizedValue
            )}
          />
          <Table.Column
            title="Value Source"
            dataIndex="mapping"
            key="source"
            width={205}
            align="right"
            render={mapping => (
              <SourceInput
                mapping={mapping}
                existingParamNames={this.props.existingParamNames}
                onChange={newMapping => this.updateParamMapping(mapping, newMapping)}
                getContainerElement={() => this.wrapperRef.current}
                clientConfig={clientConfig}
                Query={Query}
              />
            )}
          />
        </Table>
      </div>
    );
  }
}
