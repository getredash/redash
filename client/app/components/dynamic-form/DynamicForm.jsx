import React from 'react';
import PropTypes from 'prop-types';
import { Form, Input, InputNumber, Checkbox, Button, Upload, Icon, message } from 'antd';
import { react2angular } from 'react2angular';
import { Field, Action, AntdForm } from '../proptypes';
import helper from './dynamicFormHelper';

const getValuePropNameForType = (type) => {
  switch (type) {
    case 'checkbox':
      return 'checked';
    case 'file':
      return 'fileList';
    default:
      return 'value';
  }
};

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

  constructor(props) {
    super(props);

    this.state = {
      isSubmitting: false,
      inProgressActions: [],
    };

    this.actionCallbacks = this.props.actions.reduce((acc, cur) => ({
      ...acc,
      [cur.name]: cur.callback,
    }), []);

    props.actions.forEach((action) => {
      this.state.inProgressActions[action.name] = false;
    });
  }

  handleSubmit = (e) => {
    this.setState({ isSubmitting: true });
    e.preventDefault();
    this.props.form.validateFieldsAndScroll((err, values) => {
      if (!err) {
        this.props.onSubmit(
          values,
          (msg) => {
            const { setFieldsValue, getFieldsValue } = this.props.form;
            this.setState({ isSubmitting: false });
            setFieldsValue(getFieldsValue()); // reset form touched state
            message.success(msg);
          },
          (msg) => {
            this.setState({ isSubmitting: false });
            message.error(msg);
          },
        );
      } else this.setState({ isSubmitting: false });
    });
  }

  handleAction = (e) => {
    const actionName = e.target.dataset.action;

    this.setState({
      inProgressActions: {
        ...this.state.inProgressActions,
        [actionName]: true,
      },
    });
    this.actionCallbacks[actionName](() => {
      this.setState({
        inProgressActions: {
          ...this.state.inProgressActions,
          [actionName]: false,
        },
      });
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
      rules: [{ required: field.required, message: `${fieldLabel} is required.` }],
      valuePropName: getValuePropNameForType(type),
      initialValue,
    };

    const uploadButton = (<Button><Icon type="upload" /> Click to upload</Button>);

    if (type === 'checkbox') {
      return getFieldDecorator(name, options)(<Checkbox {...props}>{fieldLabel}</Checkbox>);
    } else if (type === 'file') {
      return getFieldDecorator(name, options)(<Upload {...props}>{uploadButton}</Upload>);
    } else if (type === 'number') {
      return getFieldDecorator(name, options)(<InputNumber {...props} />);
    }
    return getFieldDecorator(name, options)(<Input {...props} />);
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

  renderActions() {
    return this.props.actions.map((action) => {
      const inProgress = this.state.inProgressActions[action.name];

      const actionProps = {
        key: action.name,
        htmlType: 'button',
        className: `${action.class} m-t-10`,
        disabled: inProgress || this.props.form.isFieldsTouched(),
        loading: inProgress,
        onClick: this.handleAction,
      };

      return (<Button {...actionProps} data-action={action.name}>{action.name}</Button>);
    });
  }

  render() {
    const submitProps = {
      type: 'primary',
      htmlType: 'submit',
      className: 'w-100',
      disabled: this.state.isSubmitting,
      loading: this.state.isSubmitting,
    };

    return (
      <Form onSubmit={this.handleSubmit}>
        {this.renderFields()}
        <Button {...submitProps}>
          Save
        </Button>
        {this.renderActions()}
      </Form>
    );
  }
}

export default function init(ngModule) {
  ngModule.component('dynamicForm', react2angular((props) => {
    const UpdatedDynamicForm = Form.create()(DynamicForm);
    const fields = helper.getFields(props.type.configuration_schema, props.target);

    const onSubmit = (values, onSuccess, onError) => {
      helper.updateTargetWithValues(props.target, values);
      props.target.$save(
        () => {
          onSuccess('Saved.');
        },
        (error) => {
          if (error.status === 400 && 'message' in error.data) {
            onError(error.data.message);
          } else {
            onError('Failed saving.');
          }
        },
      );
    };

    const updatedProps = {
      fields,
      actions: props.target.id ? props.actions : [],
      onSubmit,
    };

    return (<UpdatedDynamicForm {...updatedProps} />);
  }, ['target', 'type', 'actions']));
}

init.init = true;
