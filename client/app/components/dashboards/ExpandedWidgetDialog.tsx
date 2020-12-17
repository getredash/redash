import React from "react";
import Button from "antd/lib/button";
import Modal from "antd/lib/modal";
// @ts-expect-error ts-migrate(6133) FIXME: 'DialogPropType' is declared but its value is neve... Remove this comment to see the full error message
import { wrap as wrapDialog, DialogPropType } from "@/components/DialogWrapper";
// @ts-expect-error ts-migrate(6133) FIXME: 'FiltersType' is declared but its value is never r... Remove this comment to see the full error message
import { FiltersType } from "@/components/Filters";
import VisualizationRenderer from "@/components/visualizations/VisualizationRenderer";
import VisualizationName from "@/components/visualizations/VisualizationName";

type OwnProps = {
    // @ts-expect-error ts-migrate(2749) FIXME: 'DialogPropType' refers to a value, but is being u... Remove this comment to see the full error message
    dialog: DialogPropType;
    widget: any;
    // @ts-expect-error ts-migrate(2749) FIXME: 'FiltersType' refers to a value, but is being used... Remove this comment to see the full error message
    filters?: FiltersType;
};

type Props = OwnProps & typeof ExpandedWidgetDialog.defaultProps;

function ExpandedWidgetDialog({ dialog, widget, filters }: Props) {
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

ExpandedWidgetDialog.defaultProps = {
  filters: [],
};

export default wrapDialog(ExpandedWidgetDialog);
