import { isMatch, map, find, sortBy } from "lodash";
import React from "react";
import Modal from "antd/lib/modal";
// @ts-expect-error ts-migrate(6133) FIXME: 'DialogPropType' is declared but its value is neve... Remove this comment to see the full error message
import { wrap as wrapDialog, DialogPropType } from "@/components/DialogWrapper";
import {
  MappingType,
  ParameterMappingListInput,
  parameterMappingsToEditableMappings,
  editableMappingsToParameterMappings,
  synchronizeWidgetTitles,
} from "@/components/ParameterMappingInput";
import notification from "@/services/notification";

export function getParamValuesSnapshot(mappings: any, dashboardParameters: any) {
  return map(
    sortBy(mappings, m => m.name),
    m => {
      let param;
      switch (m.type) {
        case MappingType.StaticValue:
          return [m.name, m.value];
        case MappingType.WidgetLevel:
          return [m.name, m.param.value];
        case MappingType.DashboardAddNew:
        case MappingType.DashboardMapToExisting:
          param = find(dashboardParameters, p => p.name === m.mapTo);
          return [m.name, param ? param.value : null];
        // no default
      }
    }
  );
}

type Props = {
    dashboard: any;
    widget: any;
    // @ts-expect-error ts-migrate(2749) FIXME: 'DialogPropType' refers to a value, but is being u... Remove this comment to see the full error message
    dialog: DialogPropType;
};

type State = any;

class EditParameterMappingsDialog extends React.Component<Props, State> {

  originalParamValuesSnapshot = null;

  constructor(props: Props) {
    super(props);

    const parameterMappings = parameterMappingsToEditableMappings(
      props.widget.options.parameterMappings,
      props.widget.query.getParametersDefs(),
      // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'any[]' is not assignable to para... Remove this comment to see the full error message
      map(this.props.dashboard.getParametersDefs(), p => p.name)
    );

    // @ts-expect-error ts-migrate(2322) FIXME: Type '(any[] | undefined)[]' is not assignable to ... Remove this comment to see the full error message
    this.originalParamValuesSnapshot = getParamValuesSnapshot(
      parameterMappings,
      this.props.dashboard.getParametersDefs()
    );

    this.state = {
      saveInProgress: false,
      parameterMappings,
    };
  }

  saveWidget() {
    const widget = this.props.widget;

    this.setState({ saveInProgress: true });

    const newMappings = editableMappingsToParameterMappings(this.state.parameterMappings);
    widget.options.parameterMappings = newMappings;

    const valuesChanged = !isMatch(
      // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'null' is not assignable to param... Remove this comment to see the full error message
      this.originalParamValuesSnapshot,
      getParamValuesSnapshot(this.state.parameterMappings, this.props.dashboard.getParametersDefs())
    );

    const widgetsToSave = [
      widget,
      ...synchronizeWidgetTitles(widget.options.parameterMappings, this.props.dashboard.widgets),
    ];

    Promise.all(map(widgetsToSave, w => w.save()))
      .then(() => {
        this.props.dialog.close(valuesChanged);
      })
      .catch(() => {
        // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'string' is not assignable to par... Remove this comment to see the full error message
        notification.error("Widget cannot be updated");
      })
      .finally(() => {
        this.setState({ saveInProgress: false });
      });
  }

  updateParamMappings(parameterMappings: any) {
    this.setState({ parameterMappings });
  }

  render() {
    const { dialog } = this.props;
    return (
      <Modal
        {...dialog.props}
        title="Parameters"
        onOk={() => this.saveWidget()}
        okButtonProps={{ loading: this.state.saveInProgress }}
        width={700}>
        {this.state.parameterMappings.length > 0 && (
          <ParameterMappingListInput
            mappings={this.state.parameterMappings}
            existingParams={this.props.dashboard.getParametersDefs()}
            // @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call.
            onChange={(mappings: any) => this.updateParamMappings(mappings)}
          />
        )}
      </Modal>
    );
  }
}

export default wrapDialog(EditParameterMappingsDialog);
