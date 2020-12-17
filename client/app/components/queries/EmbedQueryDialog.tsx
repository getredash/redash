import React from "react";
import Alert from "antd/lib/alert";
import Button from "antd/lib/button";
import Checkbox from "antd/lib/checkbox";
import Form from "antd/lib/form";
import InputNumber from "antd/lib/input-number";
import Modal from "antd/lib/modal";
// @ts-expect-error ts-migrate(6133) FIXME: 'DialogPropType' is declared but its value is neve... Remove this comment to see the full error message
import { wrap as wrapDialog, DialogPropType } from "@/components/DialogWrapper";
import { clientConfig } from "@/services/auth";
import CodeBlock from "@/components/CodeBlock";
import "./EmbedQueryDialog.less";
type Props = {
    // @ts-expect-error ts-migrate(2749) FIXME: 'DialogPropType' refers to a value, but is being u... Remove this comment to see the full error message
    dialog: DialogPropType;
    query: any;
    visualization: any;
};
type State = any;
class EmbedQueryDialog extends React.Component<Props, State> {
    embedUrl: any;
    snapshotUrl: any;
    state = {
        enableChangeIframeSize: false,
        iframeWidth: 720,
        iframeHeight: 391,
    };
    constructor(props: Props) {
        super(props);
        const { query, visualization } = props;
        this.embedUrl = `${(clientConfig as any).basePath}embed/query/${query.id}/visualization/${visualization.id}?api_key=${query.api_key}&${query.getParameters().toUrlParams()}`;
        if ((window as any).snapshotUrlBuilder) {
            this.snapshotUrl = (window as any).snapshotUrlBuilder(query, visualization);
        }
    }
    render() {
        const { query, dialog } = this.props;
        const { enableChangeIframeSize, iframeWidth, iframeHeight } = this.state;
        return (<Modal {...dialog.props} className="embed-query-dialog" title="Embed Query" footer={<Button onClick={dialog.dismiss}>Close</Button>}>
        {query.is_safe ? (<React.Fragment>
            <h5 className="m-t-0">Public URL</h5>
            <div className="m-b-30">
              <CodeBlock data-test="EmbedIframe" copyable>
                {this.embedUrl}
              </CodeBlock>
            </div>
            <h5 className="m-t-0">IFrame Embed</h5>
            <div>
              <CodeBlock copyable>
                {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'null | un... Remove this comment to see the full error message */}
                {`<iframe src="${this.embedUrl}" width="${iframeWidth}" height="${iframeHeight}"></iframe>`}
              </CodeBlock>
              <Form className="m-t-10" layout="inline">
                <Form.Item>
                  <Checkbox checked={enableChangeIframeSize} onChange={e => this.setState({ enableChangeIframeSize: e.target.checked })}/>
                </Form.Item>
                <Form.Item label="Width">
                  <InputNumber className="size-input" value={iframeWidth} onChange={value => this.setState({ iframeWidth: value })} size="small" disabled={!enableChangeIframeSize}/>
                </Form.Item>
                <Form.Item label="Height">
                  <InputNumber className="size-input" value={iframeHeight} onChange={value => this.setState({ iframeHeight: value })} size="small" disabled={!enableChangeIframeSize}/>
                </Form.Item>
              </Form>
            </div>
            {this.snapshotUrl && (<React.Fragment>
                <h5>Image Embed</h5>
                <CodeBlock copyable>{this.snapshotUrl}</CodeBlock>
              </React.Fragment>)}
          </React.Fragment>) : (<Alert message="Currently it is not possible to embed queries that contain text parameters." type="error" data-test="EmbedErrorAlert"/>)}
      </Modal>);
    }
}
export default wrapDialog(EmbedQueryDialog);
