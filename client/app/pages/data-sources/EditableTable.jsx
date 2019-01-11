import React from 'react';
import Form from 'antd/lib/form';
import Checkbox from 'antd/lib/checkbox';
import Input from 'antd/lib/input';
const { TextArea } = Input;

const FormItem = Form.Item;
export const EditableContext = React.createContext();

const EditableRow = ({ form, index, ...props }) => (
  <EditableContext.Provider value={form}>
    <tr {...props} />
  </EditableContext.Provider>
);

export const EditableFormRow = Form.create()(EditableRow);

export class EditableCell extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      visible: this.props.record ? this.props.record.table_visible : false
    };
  }

  onChange = () => {
    this.setState({ visible: !this.state.visible });
  }

  getInput = () => {
    if (this.props.inputType === 'checkbox') {
      return (
        <TableVisibilityCheckbox
          visible={this.state.visible}
          onChange={this.onChange}
        ></TableVisibilityCheckbox>);
    }
    return <TextArea autosize={{ minRows: 1 }} style={{ resize: 'vertical' }}/>;
  };

  render() {
    const {
      editing,
      dataIndex,
      title,
      inputType,
      record,
      index,
      ...restProps
    } = this.props;

    return (
      <EditableContext.Consumer>
        {(form) => {
          const { getFieldDecorator } = form;
          return (
            <td {...restProps}>
              {editing ? (
                <FormItem style={{ margin: 0 }}>
                  {getFieldDecorator(dataIndex, {
                    initialValue: record[dataIndex],
                  })(this.getInput()) }
                </FormItem>
              ) : restProps.children}
            </td>
          );
        }}
      </EditableContext.Consumer>
    );
  }
}
