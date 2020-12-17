import { replace } from "lodash";
import React from "react";
import { axios } from "@/services/axios";
import Switch from "antd/lib/switch";
import Modal from "antd/lib/modal";
import Form from "antd/lib/form";
import Alert from "antd/lib/alert";
import notification from "@/services/notification";
// @ts-expect-error ts-migrate(6133) FIXME: 'DialogPropType' is declared but its value is neve... Remove this comment to see the full error message
import { wrap as wrapDialog, DialogPropType } from "@/components/DialogWrapper";
import InputWithCopy from "@/components/InputWithCopy";
import HelpTrigger from "@/components/HelpTrigger";
const API_SHARE_URL = "api/dashboards/{id}/share";
type Props = {
    dashboard: any;
    hasOnlySafeQueries: boolean;
    // @ts-expect-error ts-migrate(2749) FIXME: 'DialogPropType' refers to a value, but is being u... Remove this comment to see the full error message
    dialog: DialogPropType;
};
type State = any;
class ShareDashboardDialog extends React.Component<Props, State> {
    apiUrl: any;
    enabled: any;
    formItemProps = {
        labelCol: { span: 8 },
        wrapperCol: { span: 16 },
        style: { marginBottom: 7 },
    };
    constructor(props: Props) {
        super(props);
        const { dashboard } = this.props;
        this.state = {
            saving: false,
        };
        this.apiUrl = replace(API_SHARE_URL, "{id}", dashboard.id);
        this.enabled = this.props.hasOnlySafeQueries || dashboard.publicAccessEnabled;
    }
    static get headerContent() {
        return (<React.Fragment>
        Share Dashboard
        <div className="modal-header-desc">
          {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'. */}
          Allow public access to this dashboard with a secret address. <HelpTrigger type="SHARE_DASHBOARD"/>
        </div>
      </React.Fragment>);
    }
    enableAccess = () => {
        const { dashboard } = this.props;
        this.setState({ saving: true });
        axios
            .post(this.apiUrl)
            .then(data => {
            dashboard.publicAccessEnabled = true;
            dashboard.public_url = (data as any).public_url;
        })
            .catch(() => {
            // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'string' is not assignable to par... Remove this comment to see the full error message
            notification.error("Failed to turn on sharing for this dashboard");
        })
            .finally(() => {
            this.setState({ saving: false });
        });
    };
    disableAccess = () => {
        const { dashboard } = this.props;
        this.setState({ saving: true });
        axios
            .delete(this.apiUrl)
            .then(() => {
            dashboard.publicAccessEnabled = false;
            delete dashboard.public_url;
        })
            .catch(() => {
            // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'string' is not assignable to par... Remove this comment to see the full error message
            notification.error("Failed to turn off sharing for this dashboard");
        })
            .finally(() => {
            this.setState({ saving: false });
        });
    };
    onChange = (checked: any) => {
        if (checked) {
            this.enableAccess();
        }
        else {
            this.disableAccess();
        }
    };
    render() {
        const { dialog, dashboard } = this.props;
        return (<Modal {...dialog.props} title={(this.constructor as any).headerContent} footer={null}>
        <Form layout="horizontal">
          {!this.props.hasOnlySafeQueries && (<Form.Item>
              <Alert message="For your security, sharing is currently not supported for dashboards containing queries with text parameters. Consider changing the text parameters in your query to a different type." type="error"/>
            </Form.Item>)}
          <Form.Item label="Allow public access" {...this.formItemProps}>
            <Switch checked={dashboard.publicAccessEnabled} onChange={this.onChange} loading={this.state.saving} disabled={!this.enabled} data-test="PublicAccessEnabled"/>
          </Form.Item>
          {dashboard.public_url && (<Form.Item label="Secret address" {...this.formItemProps}>
              {/* @ts-expect-error ts-migrate(2322) FIXME: Type '{ value: any; "data-test": string; }' is not... Remove this comment to see the full error message */}
              <InputWithCopy value={dashboard.public_url} data-test="SecretAddress"/>
            </Form.Item>)}
        </Form>
      </Modal>);
    }
}
export default wrapDialog(ShareDashboardDialog);
