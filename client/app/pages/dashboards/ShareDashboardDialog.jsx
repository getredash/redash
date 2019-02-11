import { replace } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import Switch from 'antd/lib/switch';
import Modal from 'antd/lib/modal';
import Form from 'antd/lib/form';
import { $http, toastr } from '@/services/ng';
import { wrap as wrapDialog, DialogPropType } from '@/components/DialogWrapper';
import InputWithCopy from '@/components/InputWithCopy';

const API_SHARE_URL = 'api/dashboards/{0}/share';

class ShareDashboardDialog extends React.Component {
  static propTypes = {
    dashboard: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
    dialog: DialogPropType.isRequired,
  };

  formItemProps = {
    labelCol: { span: 8 },
    wrapperCol: { span: 16 },
    style: { marginBottom: 7 },
  }

  constructor(props) {
    super(props);
    this.state = {
      saving: false,
      url: replace(API_SHARE_URL, '{0}', props.dashboard.id),
    };
  }

  enable = () => {
    const { dashboard } = this.props;
    this.setState({ saving: true });

    $http
      .post(this.state.url)
      .success((data) => {
        dashboard.publicAccessEnabled = true;
        dashboard.public_url = data.public_url;
      })
      .error(() => {
        toastr.error('Failed to turn on sharing for this dashboard');
      })
      .finally(() => {
        this.setState({ saving: false });
      });
  }

  disable = () => {
    const { dashboard } = this.props;
    this.setState({ saving: true });

    $http
      .delete(this.state.url)
      .success(() => {
        dashboard.publicAccessEnabled = false;
        delete dashboard.public_url;
      })
      .error(() => {
        toastr.error('Failed to turn off sharing for this dashboard');
      })
      .finally(() => {
        this.setState({ saving: false });
      });
  }

  onChange = (checked) => {
    if (checked) {
      this.enable();
    } else {
      this.disable();
    }
  };


  render() {
    const { dialog, dashboard } = this.props;

    return (
      <Modal
        {...dialog.props}
        title="Share Dashboard"
        footer={null}
      >
        <Form layout="horizontal">
          <Form.Item label="Allow public access" {...this.formItemProps}>
            <Switch
              checked={dashboard.publicAccessEnabled}
              onChange={this.onChange}
              loading={this.state.saving}
            />
          </Form.Item>
          {dashboard.public_url && (
            <Form.Item label="Share secret address" {...this.formItemProps}>
              <InputWithCopy value={dashboard.public_url} />
            </Form.Item>
          )}
        </Form>
      </Modal>
    );
  }
}

export default wrapDialog(ShareDashboardDialog);
