import { size, filter, forEach, extend } from "lodash";
import React from "react";
import { SortableContainer, SortableElement, DragHandle } from "@redash/viz/lib/components/sortable";
import location from "@/services/location";
import { createParameter } from "@/services/parameters";
import ParameterApplyButton from "@/components/ParameterApplyButton";
import ParameterValueInput from "@/components/ParameterValueInput";
import EditParameterSettingsDialog from "./EditParameterSettingsDialog";
import { toHuman } from "@/lib/utils";

import "./Parameters.less";

function updateUrl(parameters: any) {
  const params = extend({}, location.search);
  parameters.forEach((param: any) => {
    extend(params, param.toUrlParams());
  });
  location.setSearch(params, true);
}

type OwnProps = {
    parameters?: any[]; // TODO: PropTypes.instanceOf(Parameter)
    editable?: boolean;
    disableUrlUpdate?: boolean;
    onValuesChange?: (...args: any[]) => any;
    onPendingValuesChange?: (...args: any[]) => any;
    onParametersEdit?: (...args: any[]) => any;
};

type State = any;

type Props = OwnProps & typeof Parameters.defaultProps;

export default class Parameters extends React.Component<Props, State> {
  static defaultProps = {
    parameters: [],
    editable: false,
    disableUrlUpdate: false,
    onValuesChange: () => {},
    onPendingValuesChange: () => {},
    onParametersEdit: () => {},
  };

  onBeforeSortStart: any;

  constructor(props: Props) {
    super(props);
    const { parameters } = props;
    this.state = { parameters };
    if (!props.disableUrlUpdate) {
      updateUrl(parameters);
    }
  }

  componentDidUpdate = (prevProps: any) => {
    const { parameters, disableUrlUpdate } = this.props;
    const parametersChanged = prevProps.parameters !== parameters;
    const disableUrlUpdateChanged = prevProps.disableUrlUpdate !== disableUrlUpdate;
    if (parametersChanged) {
      this.setState({ parameters });
    }
    if ((parametersChanged || disableUrlUpdateChanged) && !disableUrlUpdate) {
      updateUrl(parameters);
    }
  };

  handleKeyDown = (e: any) => {
    // Cmd/Ctrl/Alt + Enter
    if (e.keyCode === 13 && (e.ctrlKey || e.metaKey || e.altKey)) {
      e.stopPropagation();
      this.applyChanges();
    }
  };

  setPendingValue = (param: any, value: any, isDirty: any) => {
    const { onPendingValuesChange } = this.props;
    this.setState(({
      parameters
    }: any) => {
      if (isDirty) {
        param.setPendingValue(value);
      } else {
        param.clearPendingValue();
      }
      onPendingValuesChange();
      return { parameters };
    });
  };

  moveParameter = ({
    oldIndex,
    newIndex
  }: any) => {
    const { onParametersEdit } = this.props;
    if (oldIndex !== newIndex) {
      this.setState(({
        parameters
      }: any) => {
        parameters.splice(newIndex, 0, parameters.splice(oldIndex, 1)[0]);
        onParametersEdit();
        return { parameters };
      });
    }
  };

  applyChanges = () => {
    const { onValuesChange, disableUrlUpdate } = this.props;
    this.setState(({
      parameters
    }: any) => {
      const parametersWithPendingValues = parameters.filter((p: any) => p.hasPendingValue);
      forEach(parameters, p => p.applyPendingValue());
      if (!disableUrlUpdate) {
        updateUrl(parameters);
      }
      onValuesChange(parametersWithPendingValues);
      return { parameters };
    });
  };

  showParameterSettings = (parameter: any, index: any) => {
    const { onParametersEdit } = this.props;
    EditParameterSettingsDialog.showModal({ parameter }).onClose((updated: any) => {
      this.setState(({
        parameters
      }: any) => {
        const updatedParameter = extend(parameter, updated);
        parameters[index] = createParameter(updatedParameter, updatedParameter.parentQueryId);
        onParametersEdit();
        return { parameters };
      });
    });
  };

  renderParameter(param: any, index: any) {
    const { editable } = this.props;
    return (
      <div key={param.name} className="di-block" data-test={`ParameterName-${param.name}`}>
        <div className="parameter-heading">
          <label>{param.title || toHuman(param.name)}</label>
          {editable && (
            <button
              className="btn btn-default btn-xs m-l-5"
              onClick={() => this.showParameterSettings(param, index)}
              data-test={`ParameterSettings-${param.name}`}
              type="button">
              <i className="fa fa-cog" />
            </button>
          )}
        </div>
        <ParameterValueInput
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'any' is not assignable to type 'never'.
          type={param.type}
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'any' is not assignable to type 'never'.
          value={param.normalizedValue}
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'any' is not assignable to type 'never'.
          parameter={param}
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'any' is not assignable to type 'never'.
          enumOptions={param.enumOptions}
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'any' is not assignable to type 'never'.
          queryId={param.queryId}
          // @ts-expect-error ts-migrate(2322) FIXME: Type '(value: any, isDirty: any) => void' is not a... Remove this comment to see the full error message
          onSelect={(value: any, isDirty: any) => this.setPendingValue(param, value, isDirty)}
        />
      </div>
    );
  }

  render() {
    const { parameters } = this.state;
    const { editable } = this.props;
    const dirtyParamCount = size(filter(parameters, "hasPendingValue"));
    return (
      // @ts-expect-error ts-migrate(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message
      <SortableContainer
        disabled={!editable}
        axis="xy"
        useDragHandle
        lockToContainerEdges
        helperClass="parameter-dragged"
        updateBeforeSortStart={this.onBeforeSortStart}
        onSortEnd={this.moveParameter}
        containerProps={{
          className: "parameter-container",
          onKeyDown: dirtyParamCount ? this.handleKeyDown : null,
        }}>
        {parameters.map((param: any, index: any) => (
          <SortableElement key={param.name} index={index}>
            <div className="parameter-block" data-editable={editable || null}>
              {editable && <DragHandle data-test={`DragHandle-${param.name}`} />}
              {this.renderParameter(param, index)}
            </div>
          </SortableElement>
        ))}
        <ParameterApplyButton onClick={this.applyChanges} paramCount={dirtyParamCount} />
      </SortableContainer>
    );
  }
}
