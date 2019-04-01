import React from 'react';
import PropTypes from 'prop-types';
import Form from 'antd/lib/form';
import Input from 'antd/lib/input';
import InputNumber from 'antd/lib/input-number';
import Checkbox from 'antd/lib/checkbox';
import Button from 'antd/lib/button';
import Upload from 'antd/lib/upload';
import Icon from 'antd/lib/icon';
import { includes, isFunction } from 'lodash';
import Select from 'antd/lib/select';
import notification from '@/services/notification';
import { Field, Action, AntdForm } from '../proptypes';
import helper from './dynamicFormHelper';

const fieldRules = ({ type, required, minLength }) => {
  const requiredRule = required;
  const minLengthRule = minLength && includes(['text', 'email', 'password'], type);
  const emailTypeRule = type === 'email';

  return [
    requiredRule && { required, message: 'This field is required.' },
    minLengthRule && { min: minLength, message: 'This field is too short.' },
    emailTypeRule && { type: 'email', message: 'This field must be a valid email.' },
  ].filter(rule => rule);
};

class DynamicForm extends React.Component {
  static propTypes = {
    id: PropTypes.string,
    fields: PropTypes.arrayOf(Field),
    actions: PropTypes.arrayOf(Action),
    feedbackIcons: PropTypes.bool,
    hideSubmitButton: PropTypes.bool,
    saveText: PropTypes.string,
    onSubmit: PropTypes.func,
    form: AntdForm.isRequired,
  };

  static defaultProps = {
    id: null,
    fields: [],
    actions: [],
    feedbackIcons: false,
    hideSubmitButton: false,
    saveText: 'Save',
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
    }), null);

    props.actions.forEach((action) => {
      this.state.inProgressActions[action.name] = false;
    });
  }

  setActionInProgress = (actionName, inProgress) => {
    this.setState(prevState => ({
      inProgressActions: {
        ...prevState.inProgressActions,
        [actionName]: inProgress,
      },
    }));
  };

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
            notification.success(msg);
          },
          (msg) => {
            this.setState({ isSubmitting: false });
            notification.error(msg);
          },
        );
      } else this.setState({ isSubmitting: false });
    });
  }

  handleAction = (e) => {
    const actionName = e.target.dataset.action;

    this.setActionInProgress(actionName, true);
    this.actionCallbacks[actionName](() => {
      this.setActionInProgress(actionName, false);
    });
  }

  base64File = (fieldName, e) => {
    if (e && e.fileList[0]) {
      helper.getBase64(e.file).then((value) => {
        this.props.form.setFieldsValue({ [fieldName]: value });
      });
    }
  }

  renderUpload(field, props) {
    const { getFieldDecorator, getFieldValue } = this.props.form;
    const { name, initialValue } = field;

    const fileOptions = {
      rules: fieldRules(field),
      initialValue,
      getValueFromEvent: this.base64File.bind(this, name),
    };

    const disabled = getFieldValue(name) !== undefined && getFieldValue(name) !== initialValue;

    const upload = (
      <Upload {...props} beforeUpload={() => false}>
        <Button disabled={disabled}><Icon type="upload" /> Click to upload</Button>
      </Upload>
    );

    return getFieldDecorator(name, fileOptions)(upload);
  }

  renderSelect(field, props) {
    const { getFieldDecorator } = this.props.form;
    const { name, options, mode, initialValue, readOnly, loading } = field;
    const { Option } = Select;

    const decoratorOptions = {
      rules: fieldRules(field),
      initialValue,
    };

    return getFieldDecorator(name, decoratorOptions)(
      <Select {...props} optionFilterProp="children" loading={loading || false} mode={mode}>
        {options && options.map(({ value, title }) => (
          <Option key={`${value}`} value={value} disabled={readOnly}>{ title || value }</Option>
        ))}
      </Select>,
    );
  }

  renderField(field, props) {
    const { getFieldDecorator } = this.props.form;
    const { name, type, initialValue } = field;
    const fieldLabel = field.title || helper.toHuman(name);

    const options = {
      rules: fieldRules(field),
      valuePropName: type === 'checkbox' ? 'checked' : 'value',
      initialValue,
    };

    if (type === 'checkbox') {
      return getFieldDecorator(name, options)(<Checkbox {...props}>{fieldLabel}</Checkbox>);
    } else if (type === 'file') {
      return this.renderUpload(field, props);
    } else if (type === 'select') {
      return this.renderSelect(field, props);
    } else if (type === 'content') {
      return field.content;
    } else if (type === 'number') {
      return getFieldDecorator(name, options)(<InputNumber {...props} />);
    }
    return getFieldDecorator(name, options)(<Input {...props} />);
  }

  renderFields() {
    return this.props.fields.map((field) => {
      const FormItem = Form.Item;
      const { name, title, type, readOnly, autoFocus, contentAfter } = field;
      const fieldLabel = title || helper.toHuman(name);
      const { feedbackIcons, form } = this.props;

      const formItemProps = {
        className: 'm-b-10',
        hasFeedback: type !== 'checkbox' && type !== 'file' && feedbackIcons,
        label: type === 'checkbox' ? '' : fieldLabel,
      };

      const fieldProps = {
        ...field.props,
        className: 'w-100',
        name,
        type,
        readOnly,
        autoFocus,
        placeholder: field.placeholder,
        'data-test': fieldLabel,
      };

      return (
        <React.Fragment key={name}>
          <FormItem {...formItemProps}>{this.renderField(field, fieldProps)}</FormItem>
          {isFunction(contentAfter) ? contentAfter(form.getFieldValue(name)) : contentAfter}
        </React.Fragment>
      );
    });
  }

  renderActions() {
    return this.props.actions.map((action) => {
      const inProgress = this.state.inProgressActions[action.name];
      const { isFieldsTouched } = this.props.form;

      const actionProps = {
        key: action.name,
        htmlType: 'button',
        className: action.pullRight ? 'pull-right m-t-10' : 'm-t-10',
        type: action.type,
        disabled: (isFieldsTouched() && action.disableWhenDirty),
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
    const { id, hideSubmitButton, saveText } = this.props;
    const saveButton = !hideSubmitButton;

    return (
      <Form id={id} layout="vertical" onSubmit={this.handleSubmit}>
        {this.renderFields()}
        {saveButton && <Button {...submitProps}>{saveText}</Button>}
        {this.renderActions()}
      </Form>
    );
  }
}

export default Form.create()(DynamicForm);
