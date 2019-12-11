/* eslint-disable react/no-multi-comp */

import { isString, extend, each, has, map, includes, findIndex, find, fromPairs, clone, isEmpty } from "lodash";
import React, { Fragment } from "react";
import PropTypes from "prop-types";
import classNames from "classnames";
import Select from "antd/lib/select";
import Table from "antd/lib/table";
import Popover from "antd/lib/popover";
import Button from "antd/lib/button";
import Icon from "antd/lib/icon";
import Tag from "antd/lib/tag";
import Input from "antd/lib/input";
import Radio from "antd/lib/radio";
import Form from "antd/lib/form";
import Tooltip from "antd/lib/tooltip";
import ParameterValueInput from "@/components/ParameterValueInput";
import { ParameterMappingType } from "@/services/widget";
import { Parameter } from "@/services/parameters";
import HelpTrigger from "@/components/HelpTrigger";

import "./ParameterMappingInput.less";

const { Option } = Select;

export const MappingType = {
  DashboardAddNew: "dashboard-add-new",
  DashboardMapToExisting: "dashboard-map-to-existing",
  WidgetLevel: "widget-level",
  StaticValue: "static-value",
};

export function parameterMappingsToEditableMappings(mappings, parameters, existingParameterNames = []) {
  return map(mappings, mapping => {
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
  return fromPairs(
    map(
      // convert to map
      mappings,
      mapping => {
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
      }
    )
  );
}

export function synchronizeWidgetTitles(sourceMappings, widgets) {
  const affectedWidgets = [];

  each(sourceMappings, sourceMapping => {
    if (sourceMapping.type === ParameterMappingType.DashboardLevel) {
      each(widgets, widget => {
        const widgetMappings = widget.options.parameterMappings;
        each(widgetMappings, widgetMapping => {
          // check if mapped to the same dashboard-level parameter
          if (
            widgetMapping.type === ParameterMappingType.DashboardLevel &&
            widgetMapping.mapTo === sourceMapping.mapTo
          ) {
            // dirty check - update only when needed
            if (widgetMapping.title !== sourceMapping.title) {
              widgetMapping.title = sourceMapping.title;
              affectedWidgets.push(widget);
            }
          }
        });
      });
    }
  });

  return affectedWidgets;
}

export class ParameterMappingInput extends React.Component {
  static propTypes = {
    mapping: PropTypes.object, // eslint-disable-line react/forbid-prop-types
    existingParamNames: PropTypes.arrayOf(PropTypes.string),
    onChange: PropTypes.func,
    inputError: PropTypes.string,
  };

  static defaultProps = {
    mapping: {},
    existingParamNames: [],
    onChange: () => {},
    inputError: null,
  };

  formItemProps = {
    labelCol: { span: 5 },
    wrapperCol: { span: 16 },
    className: "form-item",
  };

  updateSourceType = type => {
    let {
      mapping: { mapTo },
    } = this.props;
    const { existingParamNames } = this.props;

    // if mapped name doesn't already exists
    // default to first select option
    if (type === MappingType.DashboardMapToExisting && !includes(existingParamNames, mapTo)) {
      mapTo = existingParamNames[0];
    }

    this.updateParamMapping({ type, mapTo });
  };

  updateParamMapping = update => {
    const { onChange, mapping } = this.props;
    const newMapping = extend({}, mapping, update);
    if (newMapping.value !== mapping.value) {
      newMapping.param = newMapping.param.clone();
      newMapping.param.setValue(newMapping.value);
    }
    if (has(update, "type")) {
      if (update.type === MappingType.StaticValue) {
        newMapping.value = newMapping.param.value;
      } else {
        newMapping.value = null;
      }
    }
    onChange(newMapping);
  };

  renderMappingTypeSelector() {
    const noExisting = isEmpty(this.props.existingParamNames);
    return (
      <Radio.Group value={this.props.mapping.type} onChange={e => this.updateSourceType(e.target.value)}>
        <Radio className="radio" value={MappingType.DashboardAddNew} data-test="NewDashboardParameterOption">
          New dashboard parameter
        </Radio>
        <Radio className="radio" value={MappingType.DashboardMapToExisting} disabled={noExisting}>
          Existing dashboard parameter{" "}
          {noExisting ? (
            <Tooltip title="There are no dashboard parameters corresponding to this data type">
              <Icon type="question-circle" theme="filled" />
            </Tooltip>
          ) : null}
        </Radio>
        <Radio className="radio" value={MappingType.WidgetLevel} data-test="WidgetParameterOption">
          Widget parameter
        </Radio>
        <Radio className="radio" value={MappingType.StaticValue} data-test="StaticValueOption">
          Static value
        </Radio>
      </Radio.Group>
    );
  }

  renderDashboardAddNew() {
    const {
      mapping: { mapTo },
    } = this.props;
    return <Input value={mapTo} onChange={e => this.updateParamMapping({ mapTo: e.target.value })} />;
  }

  renderDashboardMapToExisting() {
    const { mapping, existingParamNames } = this.props;

    return (
      <Select
        value={mapping.mapTo}
        onChange={mapTo => this.updateParamMapping({ mapTo })}
        dropdownMatchSelectWidth={false}>
        {map(existingParamNames, name => (
          <Option value={name} key={name}>
            {name}
          </Option>
        ))}
      </Select>
    );
  }

  renderStaticValue() {
    const { mapping } = this.props;
    return (
      <ParameterValueInput
        type={mapping.param.type}
        value={mapping.param.normalizedValue}
        enumOptions={mapping.param.enumOptions}
        queryId={mapping.param.queryId}
        parameter={mapping.param}
        onSelect={value => this.updateParamMapping({ value })}
      />
    );
  }

  renderInputBlock() {
    const { mapping } = this.props;
    switch (mapping.type) {
      case MappingType.DashboardAddNew:
        return ["Key", "Enter a new parameter keyword", this.renderDashboardAddNew()];
      case MappingType.DashboardMapToExisting:
        return ["Key", "Select from a list of existing parameters", this.renderDashboardMapToExisting()];
      case MappingType.StaticValue:
        return ["Value", null, this.renderStaticValue()];
      default:
        return [];
    }
  }

  render() {
    const { inputError } = this.props;
    const [label, help, input] = this.renderInputBlock();

    return (
      <Form layout="horizontal">
        <Form.Item label="Source" {...this.formItemProps}>
          {this.renderMappingTypeSelector()}
        </Form.Item>
        <Form.Item
          style={{ height: 60, visibility: input ? "visible" : "hidden" }}
          label={label}
          {...this.formItemProps}
          validateStatus={inputError ? "error" : ""}
          help={inputError || help} // empty space so line doesn't collapse
        >
          {input}
        </Form.Item>
      </Form>
    );
  }
}

class MappingEditor extends React.Component {
  static propTypes = {
    mapping: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
    existingParamNames: PropTypes.arrayOf(PropTypes.string).isRequired,
    onChange: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = {
      visible: false,
      mapping: clone(this.props.mapping),
      inputError: null,
    };
  }

  onVisibleChange = visible => {
    if (visible) this.show();
    else this.hide();
  };

  onChange = mapping => {
    let inputError = null;

    if (mapping.type === MappingType.DashboardAddNew) {
      if (isEmpty(mapping.mapTo)) {
        inputError = "Keyword must have a value";
      } else if (includes(this.props.existingParamNames, mapping.mapTo)) {
        inputError = "A parameter with this name already exists";
      }
    }

    this.setState({ mapping, inputError });
  };

  save = () => {
    this.props.onChange(this.props.mapping, this.state.mapping);
    this.hide();
  };

  show = () => {
    this.setState({
      visible: true,
      mapping: clone(this.props.mapping), // restore original state
    });
  };

  hide = () => {
    this.setState({ visible: false });
  };

  renderContent() {
    const { mapping, inputError } = this.state;

    return (
      <div className="parameter-mapping-editor" data-test="EditParamMappingPopover">
        <header>
          Edit Source and Value <HelpTrigger type="VALUE_SOURCE_OPTIONS" />
        </header>
        <ParameterMappingInput
          mapping={mapping}
          existingParamNames={this.props.existingParamNames}
          onChange={this.onChange}
          inputError={inputError}
        />
        <footer>
          <Button onClick={this.hide}>Cancel</Button>
          <Button onClick={this.save} disabled={!!inputError} type="primary">
            OK
          </Button>
        </footer>
      </div>
    );
  }

  render() {
    const { visible, mapping } = this.state;
    return (
      <Popover
        placement="left"
        trigger="click"
        content={this.renderContent()}
        visible={visible}
        onVisibleChange={this.onVisibleChange}>
        <Button size="small" type="dashed" data-test={`EditParamMappingButon-${mapping.param.name}`}>
          <Icon type="edit" />
        </Button>
      </Popover>
    );
  }
}

class TitleEditor extends React.Component {
  static propTypes = {
    existingParams: PropTypes.arrayOf(PropTypes.object),
    mapping: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
    onChange: PropTypes.func.isRequired,
  };

  static defaultProps = {
    existingParams: [],
  };

  state = {
    showPopup: false,
    title: "", // will be set on editing
  };

  onPopupVisibleChange = showPopup => {
    this.setState({
      showPopup,
      title: showPopup ? this.getMappingTitle() : "",
    });
  };

  onEditingTitleChange = event => {
    this.setState({ title: event.target.value });
  };

  getMappingTitle() {
    let { mapping } = this.props;

    if (isString(mapping.title) && mapping.title !== "") {
      return mapping.title;
    }

    // if mapped to dashboard, find source param and return it's title
    if (mapping.type === MappingType.DashboardMapToExisting) {
      const source = find(this.props.existingParams, { name: mapping.mapTo });
      if (source) {
        mapping = source;
      }
    }

    return mapping.title || mapping.param.title;
  }

  save = () => {
    const newMapping = extend({}, this.props.mapping, { title: this.state.title });
    this.props.onChange(newMapping);
    this.hide();
  };

  hide = () => {
    this.setState({ showPopup: false });
  };

  renderPopover() {
    const {
      param: { title: paramTitle },
    } = this.props.mapping;

    return (
      <div className="parameter-mapping-title-editor">
        <Input
          size="small"
          value={this.state.title}
          placeholder={paramTitle}
          onChange={this.onEditingTitleChange}
          onPressEnter={this.save}
          maxLength={100}
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

  renderEditButton() {
    const { mapping } = this.props;
    if (mapping.type === MappingType.StaticValue) {
      return (
        <Tooltip placement="right" title="Titles for static values don't appear in widgets">
          <i className="fa fa-eye-slash" />
        </Tooltip>
      );
    }
    return (
      <Popover
        placement="right"
        trigger="click"
        content={this.renderPopover()}
        visible={this.state.showPopup}
        onVisibleChange={this.onPopupVisibleChange}>
        <Button size="small" type="dashed">
          <Icon type="edit" />
        </Button>
      </Popover>
    );
  }

  render() {
    const { mapping } = this.props;
    // static value are non-editable hence disabled
    const disabled = mapping.type === MappingType.StaticValue;

    return (
      <div className={classNames("parameter-mapping-title", { disabled })}>
        <span className="text">{this.getMappingTitle()}</span>
        {this.renderEditButton()}
      </div>
    );
  }
}

export class ParameterMappingListInput extends React.Component {
  static propTypes = {
    mappings: PropTypes.arrayOf(PropTypes.object),
    existingParams: PropTypes.arrayOf(PropTypes.object),
    onChange: PropTypes.func,
  };

  static defaultProps = {
    mappings: [],
    existingParams: [],
    onChange: () => {},
  };

  static getStringValue(value) {
    // null
    if (!value) {
      return "";
    }

    // range
    if (value instanceof Object && "start" in value && "end" in value) {
      return `${value.start} ~ ${value.end}`;
    }

    // just to be safe, array or object
    if (typeof value === "object") {
      return map(value, v => this.getStringValue(v)).join(", ");
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
      if (mappedTo) {
        // just being safe
        param = mappedTo;
      }

      // static type is different since it's fed param.normalizedValue
    } else if (type === MappingType.StaticValue) {
      param = param.clone().setValue(mapping.value);
    }

    let value = Parameter.getExecutionValue(param);

    // in case of dynamic value display the name instead of value
    if (param.hasDynamicValue) {
      value = param.normalizedValue.name;
    }

    return this.getStringValue(value);
  }

  static getSourceTypeLabel({ type, mapTo }) {
    switch (type) {
      case MappingType.DashboardAddNew:
      case MappingType.DashboardMapToExisting:
        return (
          <Fragment>
            Dashboard <Tag className="tag">{mapTo}</Tag>
          </Fragment>
        );
      case MappingType.WidgetLevel:
        return "Widget parameter";
      case MappingType.StaticValue:
        return "Static value";
      default:
        return ""; // won't happen (typescript-ftw)
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
    const { existingParams } = this.props; // eslint-disable-line react/prop-types
    const dataSource = this.props.mappings.map(mapping => ({ mapping }));

    return (
      <div className="parameters-mapping-list">
        <Table dataSource={dataSource} size="middle" pagination={false} rowKey={(record, idx) => `row${idx}`}>
          <Table.Column
            title="Title"
            dataIndex="mapping"
            key="title"
            render={mapping => (
              <TitleEditor
                existingParams={existingParams}
                mapping={mapping}
                onChange={newMapping => this.updateParamMapping(mapping, newMapping)}
              />
            )}
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
            render={mapping => this.constructor.getDefaultValue(mapping, this.props.existingParams)}
          />
          <Table.Column
            title="Value Source"
            dataIndex="mapping"
            key="source"
            render={mapping => {
              const existingParamsNames = existingParams
                .filter(({ type }) => type === mapping.param.type) // exclude mismatching param types
                .map(({ name }) => name); // keep names only

              return (
                <Fragment>
                  {this.constructor.getSourceTypeLabel(mapping)}{" "}
                  <MappingEditor
                    mapping={mapping}
                    existingParamNames={existingParamsNames}
                    onChange={(oldMapping, newMapping) => this.updateParamMapping(oldMapping, newMapping)}
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
