import React from "react";
import Form from "antd/lib/form";
import Input from "antd/lib/input";
import PropTypes from "prop-types";
import { TableMetadata } from "@/components/proptypes";
import TableVisibilityCheckbox from "./TableVisibilityCheckbox";
import SampleQueryList from "./SampleQueryList";

import "./schema-table.css";

const FormItem = Form.Item;
const { TextArea } = Input;
export const EditableContext = React.createContext();

// eslint-disable-next-line react/prop-types
const EditableRow = ({ form, index, ...props }) => (
  <EditableContext.Provider value={form}>
    <tr {...props} />
  </EditableContext.Provider>
);

export const EditableFormRow = Form.create()(EditableRow);

export class EditableCell extends React.Component {
  static propTypes = {
    dataIndex: PropTypes.string,
    input_type: PropTypes.string,
    editing: PropTypes.bool,
    record: TableMetadata,
  };

  static defaultProps = {
    dataIndex: undefined,
    input_type: undefined,
    editing: false,
    record: {},
  };

  constructor(props) {
    super(props);
    this.state = {
      visible: this.props.record ? this.props.record.visible : false,
    };
  }

  onChange = () => {
    this.setState(prevState => ({ visible: !prevState.visible }));
  };

  getInput = () => {
    if (this.props.input_type === "visible") {
      return <TableVisibilityCheckbox visible={this.state.visible} onChange={this.onChange} />;
    } else if (this.props.input_type === "sample_queries") {
      return <SampleQueryList />;
    }
    return <TextArea className="table-textarea" placeholder="Enter description..." style={{ resize: "vertical" }} />;
  };

  render() {
    const { editing, dataIndex, record, ...restProps } = this.props;

    return (
      <EditableContext.Consumer>
        {form => {
          const { getFieldDecorator } = form;
          return (
            <td {...restProps}>
              {editing ? (
                <FormItem style={{ margin: 0 }}>
                  {getFieldDecorator(dataIndex, {
                    initialValue: record[dataIndex],
                  })(this.getInput())}
                </FormItem>
              ) : (
                restProps.children
              )}
            </td>
          );
        }}
      </EditableContext.Consumer>
    );
  }
}
