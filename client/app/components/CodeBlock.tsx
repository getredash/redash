import React from "react";
import Button from "antd/lib/button";
import Tooltip from "antd/lib/tooltip";
import CopyOutlinedIcon from "@ant-design/icons/CopyOutlined";
import "./CodeBlock.less";

type OwnProps = {
    copyable?: boolean;
};

type State = any;

type Props = OwnProps & typeof CodeBlock.defaultProps;

export default class CodeBlock extends React.Component<Props, State> {
  static defaultProps = {
    copyable: false,
    children: null,
  };

  copyFeatureEnabled: any;
  ref: any;
  resetCopyState: any;

  state = { copied: null };

  constructor(props: Props) {
    super(props);
    this.ref = React.createRef();
    this.copyFeatureEnabled = props.copyable && document.queryCommandSupported("copy");
    this.resetCopyState = null;
  }

  componentWillUnmount() {
    if (this.resetCopyState) {
      clearTimeout(this.resetCopyState);
    }
  }

  copy = () => {
    // select text
    // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
    window.getSelection().selectAllChildren(this.ref.current);

    // copy
    try {
      const success = document.execCommand("copy");
      if (!success) {
        throw new Error();
      }
      this.setState({ copied: "Copied!" });
    } catch (err) {
      this.setState({
        copied: "Copy failed",
      });
    }

    // reset selection
    // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
    window.getSelection().removeAllRanges();

    // reset tooltip
    this.resetCopyState = setTimeout(() => this.setState({ copied: null }), 2000);
  };

  render() {
    const { copyable, children, ...props } = this.props;

    const copyButton = (
      <Tooltip title={this.state.copied || "Copy"}>
        <Button icon={<CopyOutlinedIcon />} type="dashed" size="small" onClick={this.copy} />
      </Tooltip>
    );

    return (
      <div className="code-block">
        <code {...props} ref={this.ref}>
          {children}
        </code>
        {this.copyFeatureEnabled && copyButton}
      </div>
    );
  }
}
