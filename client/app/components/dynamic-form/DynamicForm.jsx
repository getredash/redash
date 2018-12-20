import React from 'react';
import PropTypes from 'prop-types';
import { Form, Input, Checkbox } from 'antd';
import { react2angular } from 'react2angular';
import { Field, Action } from '../proptypes';
import helper from './dynamicFormHelper';

export class DynamicForm extends React.Component {
  static propTypes = {
    fields: PropTypes.arrayOf(Field),
    actions: PropTypes.arrayOf(Action),
    onSubmit: PropTypes.func,
  };

  static defaultProps = {
    fields: [
      {
        name: 'name',
        title: 'Name',
        type: 'text',
        placeholder: 'Name',
      },
      {
        name: 'test',
        title: 'Test',
        type: 'text',
        placeholder: 'Name',
      },
      {
        name: 'check',
        title: 'Test Checkbox',
        type: 'checkbox',
      },
    ],
    actions: [],
    onSubmit: () => {},
  };

  constructor(props) {
    super(props);

    const data = this.props.fields.reduce((acc, cur) => ({
      ...acc,
      [cur.name]: cur.defaultValue,
    }), {});

    this.state = {
      data,
    };

    this.handleInputChange = this.handleInputChange.bind(this);
    this.renderFields = this.renderFields.bind(this);
  }

  handleInputChange = (e) => {
    const data = {
      ...this.state.data,
      [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value,
    };

    this.setState({
      data,
    });
  };

  renderFields() {
    const [firstItem] = this.props.fields;

    return this.props.fields.map((field) => {
      const FormItem = Form.Item;
      const {
        name,
        title,
        type,
        placeholder,
      } = field;
      const fieldLabel = title || helper.toHuman(name);

      const value = this.state.data[name];

      const props = {
        autoFocus: (firstItem === field),
        onChange: this.handleInputChange,
        name,
        placeholder,
      };

      switch (type) {
        case 'checkbox':
          return (
            <FormItem key={name} className="m-b-10">
              <Checkbox {...props} checked={value}>{fieldLabel}</Checkbox>
            </FormItem>
          );
        default:
          return (
            <FormItem key={name} label={fieldLabel} className="m-b-10">
              <Input {...props} value={value} />
            </FormItem>
          );
      }
    });
  }

  render() {
    const { onSubmit } = this.props;

    return (
      <Form onSubmit={onSubmit}>
        {this.renderFields()}
      </Form>
    );
  }
}

export default function init(ngModule) {
  ngModule.component('dynamicForm', {
    template: `
      <dynamic-form-impl
      ></dynamic-form-impl>
    `,
    bindings: {
      target: '=',
      type: '=',
      actions: '=',
      onSubmit: '=',
    },
  });
  ngModule.component('dynamicFormImpl', react2angular(DynamicForm));
}

init.init = true;
