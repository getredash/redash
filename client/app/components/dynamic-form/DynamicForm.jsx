import React from 'react';
import PropTypes from 'prop-types';
import { Form, Input, InputNumber, Checkbox, Button } from 'antd';
import { react2angular } from 'react2angular';
import { Field, Action, AntdForm } from '../proptypes';
import helper from './dynamicFormHelper';

export class DynamicForm extends React.Component {
  static propTypes = {
    fields: PropTypes.arrayOf(Field),
    actions: PropTypes.arrayOf(Action),
    onSubmit: PropTypes.func,
    form: AntdForm.isRequired,
  };

  static defaultProps = {
    fields: [],
    actions: [],
    onSubmit: () => {},
  };

  handleSubmit = (e) => {
    e.preventDefault();
    this.props.form.validateFieldsAndScroll((err, values) => {
      if (!err) {
        this.props.onSubmit(values);
      }
    });
  }

  renderField(field) {
    const [firstItem] = this.props.fields;
    const { getFieldDecorator } = this.props.form;
    const { name, type, initialValue } = field;
    const fieldLabel = field.title || helper.toHuman(name);

    const props = {
      autoFocus: (firstItem === field),
      className: 'w-100',
      name,
      type,
      placeholder: field.placeholder,
    };

    const options = {
      rules: [
        { required: field.required, message: `${fieldLabel} is required!` },
      ],
      valuePropName: type === 'checkbox' ? 'checked' : 'value',
      initialValue,
    };

    switch (type) {
      case 'checkbox':
        return getFieldDecorator(name, options)(<Checkbox {...props}>{fieldLabel}</Checkbox>);
      case 'number':
        return getFieldDecorator(name, options)(<InputNumber {...props} />);
      default:
        return getFieldDecorator(name, options)(<Input {...props} />);
    }
  }

  renderFields() {
    return this.props.fields.map((field) => {
      const FormItem = Form.Item;
      const { name, title, type } = field;
      const fieldLabel = title || helper.toHuman(name);

      const formItemProps = {
        key: name,
        className: 'm-b-10',
        hasFeedback: false,
        label: type === 'checkbox' ? '' : fieldLabel,
      };

      return (
        <FormItem {...formItemProps}>
          {this.renderField(field)}
        </FormItem>
      );
    });
  }

  render() {
    return (
      <Form onSubmit={this.handleSubmit}>
        {this.renderFields()}
        <Button type="primary" htmlType="submit">
          Save
        </Button>
      </Form>
    );
  }
}

export default function init(ngModule) {
  ngModule.directive('dynamicForm', () => ({
    restrict: 'E',
    transclude: true,
    template: `
      <dynamic-form-impl
        fields="fields"
      ></dynamic-form-impl>
    `,
    scope: {
      target: '=',
      type: '=',
      actions: '=',
    },
    link($scope) {
      $scope.fields = helper.getFields($scope.type.configuration_schema, $scope.target);
    },
  }));

  ngModule.component('dynamicFormImpl', react2angular(Form.create()(DynamicForm), ['fields']));
}

init.init = true;
