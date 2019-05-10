import React from 'react';
import PropTypes from 'prop-types';
import Button from 'antd/lib/button';
import Alert from 'antd/lib/alert';
import Modal from 'antd/lib/modal';
import Typography from 'antd/lib/typography';
import { wrap as wrapDialog, DialogPropType } from '@/components/DialogWrapper';
import { clientConfig } from '@/services/auth';

const { Text } = Typography;

function EmbedQueryDialog({ dialog, query, visualization }) {
  const embedUrl = `${clientConfig.basePath}embed/query/${query.id}/visualization/${
    visualization.id}?api_key=${query.api_key}&${query.getParameters().toUrlParams()}`;

  let snapshotUrl;
  if (window.snapshotUrlBuilder) {
    snapshotUrl = window.snapshotUrlBuilder(query, visualization);
  }

  return (
    <Modal {...dialog.props} title="Embed Code" footer={(<Button onClick={dialog.dismiss}>Close</Button>)}>
      {query.is_safe ? (
        <React.Fragment>
          <h5 className="m-t-0">Public URL</h5>
          <div className="m-b-10">
            <Text copyable code>{embedUrl}</Text>
          </div>
          <h5 className="m-t-0">IFrame Embed</h5>
          <div className="m-b-10">
            <Text data-test="EmbedIframe" copyable code>
              {`<iframe src="${embedUrl}" width="720" height="391"></iframe>`}
            </Text>
          </div>
          <Text type="secondary">(height should be adjusted)</Text>
          {snapshotUrl && (
            <React.Fragment>
              <h5>Image Embed</h5>
              <Text copyable code>{snapshotUrl}</Text>
            </React.Fragment>
          )}
        </React.Fragment>
      ) : (
        <Alert
          message="Currently it is not possible to embed queries that contain text parameters."
          type="error"
        />
      )}
    </Modal>
  );
}

EmbedQueryDialog.propTypes = {
  dialog: DialogPropType.isRequired,
  query: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  visualization: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
};

export default wrapDialog(EmbedQueryDialog);
