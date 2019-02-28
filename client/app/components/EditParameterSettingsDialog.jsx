import { includes, words, capitalize, clone, isNull } from 'lodash';
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Modal from 'antd/lib/modal';
import Form from 'antd/lib/form';
import Checkbox from 'antd/lib/checkbox';
import Select from 'antd/lib/select';
import Input from 'antd/lib/input';
import Divider from 'antd/lib/divider';
import { wrap as wrapDialog, DialogPropType } from '@/components/DialogWrapper';
import { QuerySelector } from '@/components/QuerySelector';
import { Query } from '@/services/query';

const { Option } = Select;
const formItemProps = { labelCol: { span: 6 }, wrapperCol: { span: 16 } };

function getDefaultTitle(text) {
  return capitalize(words(text).join(' ')); // humanize
}

function NameInput({ name, onChange, existingNames, setValidation }) {
  let helpText = `This is what will be added to your query editor {{ ${name} }}`;
  let validateStatus = '';

  if (!name) {
    helpText = 'Choose a keyword for this parameter';
    setValidation(false);
  } else if (includes(existingNames, name)) {
    helpText = 'Parameter with this name already exists';
    setValidation(false);
    validateStatus = 'error';
  } else {
    setValidation(true);
  }

  return (
    <Form.Item
      required
      label="Keyword"
      help={helpText}
      validateStatus={validateStatus}
      {...formItemProps}
    >
      <Input onChange={e => onChange(e.target.value)} />
    </Form.Item>
  );
}

NameInput.propTypes = {
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  existingNames: PropTypes.arrayOf(PropTypes.string).isRequired,
  setValidation: PropTypes.func.isRequired,
};

function EditParameterSettingsDialog(props) {
  const [param, setParam] = useState(clone(props.parameter));
  const [isNameValid, setIsNameValid] = useState(true);
  const [initialQuery, setInitialQuery] = useState();

  const isNew = !props.parameter.name;

  // fetch query by id
  useEffect(() => {
    const { queryId } = props.parameter;
    if (queryId) {
      Query.get({ id: queryId }, (query) => {
        setInitialQuery(query);
      });
    }
  }, []);

  function isFulfilled() {
    // name
    if (!isNameValid) {
      return false;
    }

    // title
    if (param.title === '') {
      return false;
    }

    // query
    if (param.type === 'query' && !param.queryId) {
      return false;
    }

    return true;
  }

  function onConfirm() {
    // update title to default
    if (!param.title) {
      // forced to do this cause param won't update in time for save
      param.title = getDefaultTitle(param.name);
      setParam(param);
    }

    props.dialog.close(param);
  }

  return (
    <Modal
      {...props.dialog.props}
      title={isNew ? 'Add Parameter' : param.name}
      onOk={onConfirm}
      okText={isNew ? 'Add Parameter' : null}
      okButtonProps={{ disabled: !isFulfilled() }}
    >
      <Form layout="horizontal">
        {isNew && (
          <NameInput
            name={param.name}
            onChange={name => setParam({ ...param, name })}
            setValidation={setIsNameValid}
            existingNames={props.existingParams}
          />
        )}
        <Form.Item label="Title" {...formItemProps}>
          <Input
            value={isNull(param.title) ? getDefaultTitle(param.name) : param.title}
            onChange={e => setParam({ ...param, title: e.target.value })}
          />
        </Form.Item>
        <Form.Item label="Type" {...formItemProps}>
          <Select value={param.type} onChange={type => setParam({ ...param, type })}>
            <Option value="text">Text</Option>
            <Option value="number">Number</Option>
            <Option value="enum">Dropdown List</Option>
            <Option value="query">Query Based Dropdown List</Option>
            <Option disabled key="dv1">
              <Divider className="select-option-divider" />
            </Option>
            <Option value="date">Date</Option>
            <Option value="datetime-local">Date and Time</Option>
            <Option value="datetime-with-seconds">Date and Time (with seconds)</Option>
            <Option disabled key="dv2">
              <Divider className="select-option-divider" />
            </Option>
            <Option value="date-range">Date Range</Option>
            <Option value="datetime-range">Date and Time Range</Option>
            <Option value="datetime-range-with-seconds">Date and Time Range (with seconds)</Option>
          </Select>
        </Form.Item>
        {includes(['date', 'datetime-local', 'datetime-with-seconds'], param.type) && (
          <Form.Item label=" " colon={false} {...formItemProps}>
            <Checkbox
              defaultChecked={param.useCurrentDateTime}
              onChange={e => setParam({ ...param, useCurrentDateTime: e.target.checked })}
            >
              Default to Today/Now if no other value is set
            </Checkbox>
          </Form.Item>
        )}
        {param.type === 'enum' && (
          <Form.Item label="Values" help="Dropdown list values (newline delimeted)" {...formItemProps}>
            <Input.TextArea
              rows={3}
              value={param.enumOptions}
              onChange={e => setParam({ ...param, enumOptions: e.target.value })}
            />
          </Form.Item>
        )}
        {param.type === 'query' && (
          <Form.Item label="Query" help="Select query to load dropdown values from" {...formItemProps}>
            <QuerySelector
              selectedQuery={initialQuery}
              onChange={q => setParam({ ...param, queryId: q && q.id })}
              type="select"
            />
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
