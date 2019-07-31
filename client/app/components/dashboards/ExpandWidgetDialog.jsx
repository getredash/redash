
import React from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import Button from 'antd/lib/button';
import Modal from 'antd/lib/modal';
import { VisualizationRenderer } from '@/visualizations/VisualizationRenderer';
import { wrap as wrapDialog, DialogPropType } from '@/components/DialogWrapper';

function ExpandWidgetDialog({ dialog, widget }) {
  const visualizationName = get(widget, 'visualization.name');
  return (
    <Modal
      {...dialog.props}
      title={visualizationName}
      width={900}
      footer={(<Button onClick={dialog.dismiss}>Close</Button>)}
    >
      <VisualizationRenderer visualization={widget.visualization} queryResult={widget.getQueryResult()} />
    </Modal>
  );
}

ExpandWidgetDialog.propTypes = {
  dialog: DialogPropType.isRequired,
  widget: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
};

export default wrapDialog(ExpandWidgetDialog);
