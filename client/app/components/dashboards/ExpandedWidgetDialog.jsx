import React from "react";
import PropTypes from "prop-types";
import Button from "antd/lib/button";
import Modal from "antd/lib/modal";
import { wrap as wrapDialog, DialogPropType } from "@/components/DialogWrapper";
import { FiltersType } from "@/components/Filters";
import VisualizationRenderer from "@/components/visualizations/VisualizationRenderer";
import VisualizationName from "@/components/visualizations/VisualizationName";

function ExpandedWidgetDialog({ dialog, widget, filters }) {
  return (
    <Modal
      {...dialog.props}
      title={
        <>
          <VisualizationName visualization={widget.visualization} /> <span>{widget.getQuery().name}</span>
        </>
      }
      width="95%"
      footer={<Button onClick={dialog.dismiss}>Close</Button>}>
      <VisualizationRenderer
        visualization={widget.visualization}
        queryResult={widget.getQueryResult()}
        filters={filters}
        context="widget"
      />
    </Modal>
  );
}

ExpandedWidgetDialog.propTypes = {
  dialog: DialogPropType.isRequired,
  widget: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  filters: FiltersType,
};

ExpandedWidgetDialog.defaultProps = {
  filters: [],
};

export default wrapDialog(ExpandedWidgetDialog);
