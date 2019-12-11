import React from "react";
import PropTypes from "prop-types";
import Alert from "antd/lib/alert";
import Button from "antd/lib/button";
import Checkbox from "antd/lib/checkbox";
import Form from "antd/lib/form";
import InputNumber from "antd/lib/input-number";
import Modal from "antd/lib/modal";
import { wrap as wrapDialog, DialogPropType } from "@/components/DialogWrapper";
import { clientConfig } from "@/services/auth";
import CodeBlock from "@/components/CodeBlock";
import "./EmbedQueryDialog.less";

class EmbedQueryDialog extends React.Component {
  static propTypes = {
    dialog: DialogPropType.isRequired,
    query: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
    visualization: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  };

  state = {
    enableChangeIframeSize: false,
    iframeWidth: 720,
    iframeHeight: 391,
  };

  constructor(props) {
    super(props);
    const { query, visualization } = props;
    this.embedUrl = `${clientConfig.basePath}embed/query/${query.id}/visualization/${visualization.id}?api_key=${
      query.api_key
    }&${query.getParameters().toUrlParams()}`;

    if (window.snapshotUrlBuilder) {
      this.snapshotUrl = window.snapshotUrlBuilder(query, visualization);
    }
  }

  render() {
    const { query, dialog } = this.props;
    const { enableChangeIframeSize, iframeWidth, iframeHeight } = this.state;

    return (
      <Modal
        {...dialog.props}
        className="embed-query-dialog"
        title="Embed Query"
        footer={<Button onClick={dialog.dismiss}>Close</Button>}>
        {query.is_safe ? (
          <React.Fragment>
            <h5 className="m-t-0">Public URL</h5>
            <div className="m-b-30">
              <CodeBlock data-test="EmbedIframe" copyable>
                {this.embedUrl}
              </CodeBlock>
            </div>
            <h5 className="m-t-0">IFrame Embed</h5>
            <div>
              <CodeBlock copyable>
                {`<iframe src="${this.embedUrl}" width="${iframeWidth}" height="${iframeHeight}"></iframe>`}
              </CodeBlock>
              <Form className="m-t-10" layout="inline">
                <Form.Item>
                  <Checkbox
                    checked={enableChangeIframeSize}
                    onChange={e => this.setState({ enableChangeIframeSize: e.target.checked })}
                  />
                </Form.Item>
                <Form.Item label="Width">
                  <InputNumber
                    className="size-input"
                    value={iframeWidth}
                    onChange={value => this.setState({ iframeWidth: value })}
                    size="small"
                    disabled={!enableChangeIframeSize}
                  />
                </Form.Item>
                <Form.Item label="Height">
                  <InputNumber
                    className="size-input"
                    value={iframeHeight}
                    onChange={value => this.setState({ iframeHeight: value })}
                    size="small"
                    disabled={!enableChangeIframeSize}
                  />
                </Form.Item>
              </Form>
            </div>
            {this.snapshotUrl && (
              <React.Fragment>
                <h5>Image Embed</h5>
                <CodeBlock copyable>{this.snapshotUrl}</CodeBlock>
              </React.Fragment>
            )}
          </React.Fragment>
        ) : (
          <Alert
            message="Currently it is not possible to embed queries that contain text parameters."
            type="error"
            data-test="EmbedErrorAlert"
          />
        )}
      </Modal>
    );
  }
}

export default wrapDialog(EmbedQueryDialog);
