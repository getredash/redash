import { includes, words, capitalize, clone, isNull, values, map, get, findKey } from "lodash";
import React, { useState, useEffect, useRef, useReducer } from "react";
import PropTypes from "prop-types";
import Checkbox from "antd/lib/checkbox";
import Modal from "antd/lib/modal";
import Form from "antd/lib/form";
import Button from "antd/lib/button";
import Select from "antd/lib/select";
import Icon from "antd/lib/icon";
import Input from "antd/lib/input";
import Table from "antd/lib/table";
import Divider from "antd/lib/divider";
import Tooltip from "antd/lib/tooltip";
import Popover from "antd/lib/popover";
import Radio from "antd/lib/radio";
import { wrap as wrapDialog, DialogPropType } from "@/components/DialogWrapper";
import QuerySelector from "@/components/QuerySelector";
import ParameterMappingEditor from "@/components//ParameterMappingEditor";
import ParameterValueInput from "@/components/ParameterValueInput";
import { Query } from "@/services/query";
import { QueryBasedParameterMappingType } from "@/services/parameters/QueryBasedDropdownParameter";

const { Option } = Select;
const formItemProps = { labelCol: { span: 6 }, wrapperCol: { span: 16 } };

function getDefaultTitle(text) {
  return capitalize(words(text).join(" ")); // humanize
}

function isTypeDateRange(type) {
  return /-range/.test(type);
}

function joinExampleList(multiValuesOptions) {
  const { prefix, suffix } = multiValuesOptions;
  return ["value1", "value2", "value3"].map(value => `${prefix}${value}${suffix}`).join(",");
}

function NameInput({ name, type, onChange, existingNames, setValidation }) {
  let helpText = "";
  let validateStatus = "";

  if (!name) {
    helpText = "Choose a keyword for this parameter";
    setValidation(false);
  } else if (includes(existingNames, name)) {
    helpText = "Parameter with this name already exists";
    setValidation(false);
    validateStatus = "error";
  } else {
    if (isTypeDateRange(type)) {
      helpText = (
        <React.Fragment>
          Appears in query as{" "}
          <code style={{ display: "inline-block", color: "inherit" }}>{`{{${name}.start}} {{${name}.end}}`}</code>
        </React.Fragment>
      );
    }
    setValidation(true);
  }

  return (
    <Form.Item required label="Keyword" help={helpText} validateStatus={validateStatus} {...formItemProps}>
      <Input onChange={e => onChange(e.target.value)} autoFocus />
    </Form.Item>
  );
}

NameInput.propTypes = {
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  existingNames: PropTypes.arrayOf(PropTypes.string).isRequired,
  setValidation: PropTypes.func.isRequired,
  type: PropTypes.string.isRequired,
};

// TODO: put this component in its own file
function QueryBasedParamMappingEditor({ parameter, mapping, searchAvailable, onChange }) {
  const [showPopover, setShowPopover] = useState(false);
  const [newMapping, setNewMapping] = useReducer((prevState, updates) => ({ ...prevState, ...updates }), mapping);

  const newMappingRef = useRef(newMapping);
  useEffect(() => {
    if (
      mapping.mappingType !== newMappingRef.current.mappingType ||
      mapping.staticValue !== newMappingRef.current.staticValue
    ) {
      setNewMapping(mapping);
    }
  }, [mapping]);

  const parameterRef = useRef(parameter);
  useEffect(() => {
    parameterRef.current.setValue(mapping.staticValue);
  }, [mapping.staticValue]);

  const onCancel = () => {
    setNewMapping(mapping);
    setShowPopover(false);
  };

  const onSave = () => {
    onChange(newMapping);
    setShowPopover(false);
  };

  let currentState = "Undefined";
  if (mapping.mappingType === QueryBasedParameterMappingType.DROPDOWN_SEARCH) {
    currentState = "Dropdown Search";
  } else if (mapping.mappingType === QueryBasedParameterMappingType.STATIC) {
    currentState = `Static value: ${mapping.staticValue}`;
  }
  return (
    <>
      {currentState}
      <Popover
        placement="left"
        trigger="click"
        content={
          <ParameterMappingEditor header="Edit Parameter Source" onCancel={onCancel} onSave={onSave}>
            <Form>
              <Form.Item className="m-b-15" label="Source" {...formItemProps}>
                <Radio.Group
                  value={newMapping.mappingType}
                  onChange={({ target }) => setNewMapping({ mappingType: target.value })}>
                  <Radio
                    className="radio"
                    value={QueryBasedParameterMappingType.DROPDOWN_SEARCH}
                    disabled={!searchAvailable || parameter.type !== "text"}>
                    Dropdown Search{" "}
                    {(!searchAvailable || parameter.type !== "text") && (
                      <Tooltip
                        title={
                          searchAvailable
                            ? "Dropdown Search is only available for Text Parameters"
                            : "There is already a parameter mapped with the Dropdown Search type."
                        }>
                        <Icon type="question-circle" theme="filled" />
                      </Tooltip>
                    )}
                  </Radio>
                  <Radio className="radio" value={QueryBasedParameterMappingType.STATIC}>
                    Static Value
                  </Radio>
                </Radio.Group>
              </Form.Item>
              {newMapping.mappingType === QueryBasedParameterMappingType.STATIC && (
                <Form.Item label="Value" {...formItemProps}>
                  <ParameterValueInput
                    type={parameter.type}
                    value={parameter.normalizedValue}
                    enumOptions={parameter.enumOptions}
                    queryId={parameter.queryId}
                    parameter={parameter}
                    onSelect={value => {
                      parameter.setValue(value);
                      setNewMapping({ staticValue: parameter.getExecutionValue({ joinListValues: true }) });
                    }}
                  />
                </Form.Item>
              )}
            </Form>
          </ParameterMappingEditor>
        }
        visible={showPopover}
        onVisibleChange={setShowPopover}>
        <Button className="m-l-5" size="small" type="dashed">
          <Icon type="edit" />
        </Button>
      </Popover>
    </>
  );
}

QueryBasedParamMappingEditor.propTypes = {
  parameter: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  mappingType: PropTypes.oneOf(values(QueryBasedParameterMappingType)),
  staticValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  searchAvailable: PropTypes.bool,
  onChange: PropTypes.func,
};

QueryBasedParamMappingEditor.defaultProps = {
  mappingType: QueryBasedParameterMappingType.UNDEFINED,
  staticValue: undefined,
  searchAvailable: false,
  onChange: () => {},
};

function EditParameterSettingsDialog(props) {
  const [param, setParam] = useState(clone(props.parameter));
  const [isNameValid, setIsNameValid] = useState(true);
  const [paramQuery, setParamQuery] = useState();

  const isNew = !props.parameter.name;

  // fetch query by id
  const initialQueryId = useRef(props.parameter.queryId);
  useEffect(() => {
    if (initialQueryId.current) {
      Query.get({ id: initialQueryId.current }).then(setParamQuery);
    }
  }, []);

  function isFulfilled() {
    // name
    if (!isNameValid) {
      return false;
    }

    // title
    if (param.title === "") {
      return false;
    }

    // query
    if (param.type === "query" && !param.queryId) {
      return false;
    }

    return true;
  }

  function onConfirm(e) {
    // update title to default
    if (!param.title) {
      // forced to do this cause param won't update in time for save
      param.title = getDefaultTitle(param.name);
      setParam(param);
    }

    props.dialog.close(param);

    e.preventDefault(); // stops form redirect
  }

  return (
    <Modal
      {...props.dialog.props}
      title={isNew ? "Add Parameter" : param.name}
      width={600}
      footer={[
        <Button key="cancel" onClick={props.dialog.dismiss}>
          Cancel
        </Button>,
        <Button
          key="submit"
          htmlType="submit"
          disabled={!isFulfilled()}
          type="primary"
          form="paramForm"
          data-test="SaveParameterSettings">
          {isNew ? "Add Parameter" : "OK"}
        </Button>,
      ]}>
      <Form layout="horizontal" onSubmit={onConfirm} id="paramForm">
        {isNew && (
          <NameInput
            name={param.name}
            onChange={name => setParam({ ...param, name })}
            setValidation={setIsNameValid}
            existingNames={props.existingParams}
            type={param.type}
          />
        )}
        <Form.Item label="Title" {...formItemProps}>
          <Input
            value={isNull(param.title) ? getDefaultTitle(param.name) : param.title}
            onChange={e => setParam({ ...param, title: e.target.value })}
            data-test="ParameterTitleInput"
          />
        </Form.Item>
        <Form.Item label="Type" {...formItemProps}>
          <Select value={param.type} onChange={type => setParam({ ...param, type })} data-test="ParameterTypeSelect">
            <Option value="text" data-test="TextParameterTypeOption">
              Text
            </Option>
            <Option value="number" data-test="NumberParameterTypeOption">
              Number
            </Option>
            <Option value="enum">Dropdown List</Option>
            <Option value="query">Query Based Dropdown List</Option>
            <Option disabled key="dv1">
              <Divider className="select-option-divider" />
            </Option>
            <Option value="date" data-test="DateParameterTypeOption">
              Date
            </Option>
            <Option value="datetime-local" data-test="DateTimeParameterTypeOption">
              Date and Time
            </Option>
            <Option value="datetime-with-seconds">Date and Time (with seconds)</Option>
            <Option disabled key="dv2">
              <Divider className="select-option-divider" />
            </Option>
            <Option value="date-range" data-test="DateRangeParameterTypeOption">
              Date Range
            </Option>
            <Option value="datetime-range">Date and Time Range</Option>
            <Option value="datetime-range-with-seconds">Date and Time Range (with seconds)</Option>
          </Select>
        </Form.Item>
        {param.type === "enum" && (
          <Form.Item label="Values" help="Dropdown list values (newline delimited)" {...formItemProps}>
            <Input.TextArea
              rows={3}
              value={param.enumOptions}
              onChange={e => setParam({ ...param, enumOptions: e.target.value })}
            />
          </Form.Item>
        )}
        {param.type === "query" && (
          <Form.Item label="Query" help="Select query to load dropdown values from" {...formItemProps}>
            <QuerySelector
              selectedQuery={paramQuery}
              onChange={q => {
                if (q) {
                  setParamQuery(q);
                  setParam({ ...param, queryId: q.id, parameterMapping: {} });
                }
              }}
              type="select"
            />
          </Form.Item>
        )}
        {param.type === "query" && paramQuery && paramQuery.hasParameters() && (
          <Form.Item className="m-t-15 m-b-5" label="Parameters" {...formItemProps}>
            <Table
              dataSource={map(paramQuery.getParametersDefs(), mappingParam => ({
                mappingParam,
                existingMapping: get(param.parameterMapping, mappingParam.name, {
                  mappingType: QueryBasedParameterMappingType.UNDEFINED,
                }),
              }))}
              size="middle"
              pagination={false}
              rowKey={(record, idx) => `row${idx}`}>
              <Table.Column title="Title" key="title" render={({ mappingParam }) => mappingParam.getTitle()} />
              <Table.Column
                title="Keyword"
                key="keyword"
                className="keyword"
                render={({ mappingParam }) => <code>{`{{ ${mappingParam.name} }}`}</code>}
              />
              <Table.Column
                title="Value Source"
                key="source"
                render={({ mappingParam, existingMapping }) => (
                  <QueryBasedParamMappingEditor
                    parameter={mappingParam.setValue(existingMapping.staticValue)}
                    mapping={existingMapping}
                    searchAvailable={
                      !findKey(param.parameterMapping, {
                        mappingType: QueryBasedParameterMappingType.DROPDOWN_SEARCH,
                      }) || existingMapping.mappingType === QueryBasedParameterMappingType.DROPDOWN_SEARCH
                    }
                    onChange={mapping =>
                      setParam({
                        ...param,
                        parameterMapping: { ...param.parameterMapping, [mappingParam.name]: mapping },
                      })
                    }
                  />
                )}
              />
            </Table>
          </Form.Item>
        )}
        {(param.type === "enum" || param.type === "query") && (
          <Form.Item className="m-b-0" label=" " colon={false} {...formItemProps}>
            <Checkbox
              defaultChecked={!!param.multiValuesOptions}
              onChange={e =>
                setParam({
                  ...param,
                  multiValuesOptions: e.target.checked
                    ? {
                        prefix: "",
                        suffix: "",
                        separator: ",",
                      }
                    : null,
                })
              }
              data-test="AllowMultipleValuesCheckbox">
              Allow multiple values
            </Checkbox>
          </Form.Item>
        )}
        {(param.type === "enum" || param.type === "query") && param.multiValuesOptions && (
          <Form.Item
            label="Quotation"
            help={
              <React.Fragment>
                Placed in query as: <code>{joinExampleList(param.multiValuesOptions)}</code>
              </React.Fragment>
            }
            {...formItemProps}>
            <Select
              value={param.multiValuesOptions.prefix}
              onChange={quoteOption =>
                setParam({
                  ...param,
                  multiValuesOptions: {
                    ...param.multiValuesOptions,
                    prefix: quoteOption,
                    suffix: quoteOption,
                  },
                })
              }
              data-test="QuotationSelect">
              <Option value="">None (default)</Option>
              <Option value="'">Single Quotation Mark</Option>
              <Option value={'"'} data-test="DoubleQuotationMarkOption">
                Double Quotation Mark
              </Option>
            </Select>
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}

EditParameterSettingsDialog.propTypes = {
  parameter: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  dialog: DialogPropType.isRequired,
  existingParams: PropTypes.arrayOf(PropTypes.string),
};

EditParameterSettingsDialog.defaultProps = {
  existingParams: [],
};

export default wrapDialog(EditParameterSettingsDialog);
