import React from 'react';
import PropTypes from 'prop-types';
import { findIndex, isEqual } from 'lodash';
import InputNumber from 'antd/lib/input-number';
import Form from 'antd/lib/form';
import Modal from 'antd/lib/modal';
import Radio from 'antd/lib/radio';
import { wrap as wrapDialog, DialogPropType } from '@/components/DialogWrapper';

const DATE_INTERVAL_OPTIONS = [
  { name: 'Last week', start: 7 * 24 * 60 * 60 * 1000, end: 0 },
  { name: 'Last month', start: 30 * 24 * 60 * 60 * 1000, end: 0 },
  { name: 'Last year', start: 365 * 24 * 60 * 60 * 1000, end: 0 },
];

class EditDateParameterDialog extends React.Component {
  static propTypes = {
    dialog: DialogPropType.isRequired,
    defaultOption: PropTypes.object, // eslint-disable-line react/forbid-prop-types
  };

  static defaultProps = {
    defaultOption: null,
  };

  state = {
    currentOption: 0,
  };

  formItemProps = {
    labelCol: { span: 5 },
    wrapperCol: { span: 16 },
  };

  constructor(props) {
    super(props);
    const currentOption = findIndex(DATE_INTERVAL_OPTIONS, v => isEqual(v, props.defaultOption));
    this.state = {
      currentOption: currentOption === -1 ? 'static' : currentOption,
    };
  }

  getValue = () => {
    const { currentOption } = this.state;
    switch (currentOption) {
      case 'static':
        return null;
      default:
        return DATE_INTERVAL_OPTIONS[currentOption];
    }
  }

  onChange = (e) => {
    this.setState({ currentOption: e.target.value });
  }

  onOk = () => {
    this.props.dialog.close(this.getValue());
  }

  renderCustomOptions() {
    return (
      <Form.Item {...this.formItemProps} label="Value">
        <InputNumber className="m-10" size="small" style={{ width: 70 }} /> year(s)
        <InputNumber className="m-10" size="small" style={{ width: 70 }} /> month(s)
        <InputNumber className="m-10" size="small" style={{ width: 70 }} /> day(s)
      </Form.Item>
    );
  }

  render() {
    const { dialog } = this.props;
    const radioStyle = {
      display: 'block',
      height: '30px',
      lineHeight: '30px',
    };
    return (
      <Modal {...dialog.props} title="Dynamic Date Options" onOk={this.onOk}>
        <Form>
          <Form.Item {...this.formItemProps} label="Date Range">
            <Radio.Group onChange={this.onChange} value={this.state.currentOption}>
              <Radio key="static" value="static" style={radioStyle}>
                Static value
              </Radio>
              {DATE_INTERVAL_OPTIONS.map((option, key) => (
                <Radio key={option.name} value={key} style={radioStyle}>
                  {option.name}
                </Radio>
              ))}
              <Radio value="custom" style={radioStyle}>
                Custom
              </Radio>
            </Radio.Group>
          </Form.Item>
          {this.state.currentOption === 'custom' && this.renderCustomOptions()}
        </Form>
      </Modal>
    );
  }
}

export default wrapDialog(EditDateParameterDialog);
