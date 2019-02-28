import React from 'react';
import PropTypes from 'prop-types';
import Form from 'antd/lib/form';
import Input from 'antd/lib/input';
import InputNumber from 'antd/lib/input-number';
import Checkbox from 'antd/lib/checkbox';
import Button from 'antd/lib/button';
import Upload from 'antd/lib/upload';
import Icon from 'antd/lib/icon';
import { includes } from 'lodash';
import { react2angular } from 'react2angular';
import { toastr } from '@/services/ng';
import { Field, Action, AntdForm } from '../proptypes';
import helper from './dynamicFormHelper';

const fieldRules = ({ type, required, minLength }) => {
  const requiredRule = required;
  const minLengthRule = minLength && includes(['text', 'email', 'password'], type);

  return [
    requiredRule && { required, message: 'This field is required.' },
    minLengthRule && { min: minLength, message: 'This field is too short.' },
  ].filter(rule => rule);
};

export const DynamicForm = Form.create()(class DynamicForm extends React.Component {
  static propTypes = {
    fields: PropTypes.arrayOf(Field),
    actions: PropTypes.arrayOf(Action),
    feedbackIcons: PropTypes.bool,
    hideSubmitButton: PropTypes.bool,
    saveText: PropTypes.string,
    onSubmit: PropTypes.func,
    form: AntdForm.isRequired,
  };

  static defaultProps = {
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
            toastr.success(msg);
          },
          (msg) => {
            this.setState({ isSubmitting: false });
            toastr.error(msg);
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
    } else if (type === 'number') {
      return getFieldDecorator(name, options)(<InputNumber {...props} />);
    }
    return getFieldDecorator(name, options)(<Input {...props} />);
  }

  renderFields() {
    return this.props.fields.map((field) => {
      const [firstField] = this.props.fields;
      const FormItem = Form.Item;
      const { name, title, type, readOnly } = field;
      const fieldLabel = title || helper.toHuman(name);
      const { feedbackIcons } = this.props;

      const formItemProps = {
        key: name,
        className: 'm-b-10',
        hasFeedback: type !== 'checkbox' && type !== 'file' && feedbackIcons,
        label: type === 'checkbox' ? '' : fieldLabel,
      };

      const fieldProps = {
        autoFocus: (firstField === field),
        className: 'w-100',
        name,
        type,
        readOnly,
        placeholder: field.placeholder,
        'data-test': fieldLabel,
      };

      return (<FormItem {...formItemProps}>{this.renderField(field, fieldProps)}</FormItem>);
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
    const { hideSubmitButton, saveText } = this.props;
    const saveButton = !hideSubmitButton;

    return (
      <Form layout="vertical" onSubmit={this.handleSubmit}>
        {this.renderFields()}
        {saveButton && <Button {...submitProps}>{saveText}</Button>}
        {this.renderActions()}
      </Form>
    );
  }
});

export default function init(ngModule) {
  ngModule.component('dynamicForm', react2angular((props) => {
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
      feedbackIcons: true,
      onSubmit,
    };
    return (<DynamicForm {...updatedProps} />);
  }, ['target', 'type', 'actions']));
}

init.init = true;
