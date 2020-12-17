import { trim } from "lodash";
import React from "react";
import cx from "classnames";
import Input from "antd/lib/input";
type OwnProps = {
    ignoreBlanks?: boolean;
    isEditable?: boolean;
    placeholder?: string;
    value?: string;
    onDone: (...args: any[]) => any;
    onStopEditing?: (...args: any[]) => any;
    multiline?: boolean;
    editorProps?: any;
    defaultEditing?: boolean;
};
type State = any;
type Props = OwnProps & typeof EditInPlace.defaultProps;
export default class EditInPlace extends React.Component<Props, State> {
    static defaultProps = {
        ignoreBlanks: false,
        isEditable: true,
        placeholder: "",
        value: "",
        onStopEditing: () => { },
        multiline: false,
        editorProps: {},
        defaultEditing: false,
    };
    constructor(props: Props) {
        super(props);
        this.state = {
            editing: props.defaultEditing,
        };
    }
    componentDidUpdate(_: Props, prevState: State) {
        if (!this.state.editing && prevState.editing) {
            this.props.onStopEditing();
        }
    }
    startEditing = () => {
        if (this.props.isEditable) {
            this.setState({ editing: true });
        }
    };
    stopEditing = (currentValue: any) => {
        const newValue = trim(currentValue);
        const ignorableBlank = this.props.ignoreBlanks && newValue === "";
        if (!ignorableBlank && newValue !== this.props.value) {
            this.props.onDone(newValue);
        }
        this.setState({ editing: false });
    };
    handleKeyDown = (event: any) => {
        if (event.keyCode === 13 && !event.shiftKey) {
            event.preventDefault();
            this.stopEditing(event.target.value);
        }
        else if (event.keyCode === 27) {
            this.setState({ editing: false });
        }
    };
    renderNormal = () => this.props.value ? (<span role="presentation" onFocus={this.startEditing} onClick={this.startEditing} className={this.props.isEditable ? "editable" : ""}>
        {this.props.value}
      </span>) : (<a className="clickable" onClick={this.startEditing}>
        {this.props.placeholder}
      </a>);
    renderEdit = () => {
        const { multiline, value, editorProps } = this.props;
        const InputComponent = multiline ? Input.TextArea : Input;
        return (<InputComponent defaultValue={value} onBlur={(e: any) => this.stopEditing(e.target.value)} onKeyDown={this.handleKeyDown} autoFocus {...editorProps}/>);
    };
    render() {
        return (<span className={cx("edit-in-place", { active: this.state.editing }, (this.props as any).className)}>
        {this.state.editing ? this.renderEdit() : this.renderNormal()}
      </span>);
    }
}
