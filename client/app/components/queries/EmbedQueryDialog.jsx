import React from 'react';
import PropTypes from 'prop-types';
import Alert from 'antd/lib/alert';
import Button from 'antd/lib/button';
import Form from 'antd/lib/form';
import InputNumber from 'antd/lib/input-number';
import Modal from 'antd/lib/modal';
import { wrap as wrapDialog, DialogPropType } from '@/components/DialogWrapper';
import { clientConfig } from '@/services/auth';
import CodeBlock from '@/components/CodeBlock';

class EmbedQueryDialog extends React.Component {
  static propTypes = {
    dialog: DialogPropType.isRequired,
    query: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
    visualization: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  };

  state = {
    iframeWidth: 720,
    iframeHeight: 391,
  };

  constructor(props) {
    super(props);
    const { query, visualization } = props;
    this.embedUrl = `${clientConfig.basePath}embed/query/${query.id}/visualization/${
      visualization.id}?api_key=${query.api_key}&${query.getParameters().toUrlParams()}`;

    if (window.snapshotUrlBuilder) {
      this.snapshotUrl = window.snapshotUrlBuilder(query, visualization);
    }
  }

  render() {
    const { query, dialog } = this.props;
    const { iframeWidth, iframeHeight } = this.state;

    return (
      <Modal {...dialog.props} title="Embed Code" footer={(<Button onClick={dialog.dismiss}>Close</Button>)}>
        {query.is_safe ? (
          <React.Fragment>
            <h5 className="m-t-0">Public URL</h5>
            <div className="m-b-10">
              <CodeBlock data-test="EmbedIframe" copyable>
                {this.embedUrl}
              </CodeBlock>
            </div>
            <h5 className="m-t-0">IFrame Embed</h5>
            <div className="m-b-10">
              <CodeBlock copyable>
                {`<iframe src="${this.embedUrl}" width="${iframeWidth}" height="${iframeHeight}"></iframe>`}
              </CodeBlock>
              <Form className="m-t-10 m-l-5" layout="inline">
                <Form.Item className="f-300" label="Width">
                  <InputNumber
                    value={iframeWidth}
                    onChange={value => this.setState({ iframeWidth: value })}
                  />
                </Form.Item>
                <Form.Item label="Height">
                  <InputNumber
                    value={iframeHeight}
                    onChange={value => this.setState({ iframeHeight: value })}
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
