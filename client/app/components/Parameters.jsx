import { size, filter, forEach, extend } from "lodash";
import React from "react";
import PropTypes from "prop-types";
import { SortableContainer, SortableElement, DragHandle } from "@redash/viz/lib/components/sortable";
import location from "@/services/location";
import { Parameter, createParameter } from "@/services/parameters";
import ParameterApplyButton from "@/components/ParameterApplyButton";
import ParameterValueInput from "@/components/ParameterValueInput";
import PlainButton from "@/components/PlainButton";
import EditParameterSettingsDialog from "./EditParameterSettingsDialog";
import { toHuman } from "@/lib/utils";

import "./Parameters.less";

function updateUrl(parameters) {
  const params = extend({}, location.search);
  parameters.forEach(param => {
    extend(params, param.toUrlParams());
  });
  location.setSearch(params, true);
}

export default class Parameters extends React.Component {
  static propTypes = {
    parameters: PropTypes.arrayOf(PropTypes.instanceOf(Parameter)),
    editable: PropTypes.bool,
    sortable: PropTypes.bool,
    disableUrlUpdate: PropTypes.bool,
    onValuesChange: PropTypes.func,
    onPendingValuesChange: PropTypes.func,
    onParametersEdit: PropTypes.func,
    appendSortableToParent: PropTypes.bool,
  };

  static defaultProps = {
    parameters: [],
    editable: false,
    sortable: false,
    disableUrlUpdate: false,
    onValuesChange: () => {},
    onPendingValuesChange: () => {},
    onParametersEdit: () => {},
    appendSortableToParent: true,
  };

  toCamelCase = str => {
    if (!str || str.length === 0) {
      return "";
    }
    return str.replace(/\s+/g, "").toLowerCase();
  };

  constructor(props) {
    super(props);
    
    this.parameters = props.parameters;
    if (!props.disableUrlUpdate) {
      updateUrl(this.parameters);
    }
    
    const hideRegex = /hide_filter=([^&]+)/g;
    const matches = window.location.search.matchAll(hideRegex);
    const hideValues = Array.from(matches, match => match[1]);
    
    if (hideValues.length > 0) {
      this.parameters = this.parameters.map(param => {
        for (let i = 0; i <= hideValues.length; i++) {
          if (this.toCamelCase(hideValues[i]) === this.toCamelCase(param.name)) {
            return { ...param, hidden: true };
          }
        }
        return param;
      });
    }
  }

  componentDidUpdate = prevProps => {
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

  handleKeyDown = e => {
    // Cmd/Ctrl/Alt + Enter
    if (e.keyCode === 13 && (e.ctrlKey || e.metaKey || e.altKey)) {
      e.stopPropagation();
      this.applyChanges();
    }
  };

  setPendingValue = (param, value, isDirty) => {
    const { onPendingValuesChange } = this.props;
    this.setState(({ parameters }) => {
      if (isDirty) {
        param.setPendingValue(value);
      } else {
        param.clearPendingValue();
      }
      onPendingValuesChange();
      return { parameters };
    });
  };

  moveParameter = ({ oldIndex, newIndex }) => {
    const { onParametersEdit } = this.props;
    if (oldIndex !== newIndex) {
      this.setState(({ parameters }) => {
        parameters.splice(newIndex, 0, parameters.splice(oldIndex, 1)[0]);
        onParametersEdit(parameters);
        return { parameters };
      });
    }
  };

  applyChanges = () => {
    const { onValuesChange, disableUrlUpdate } = this.props;
    this.setState(({ parameters }) => {
      const parametersWithPendingValues = parameters.filter(p => p.hasPendingValue);
      forEach(parameters, p => p.applyPendingValue());
      if (!disableUrlUpdate) {
        updateUrl(parameters);
      }
      onValuesChange(parametersWithPendingValues);
      return { parameters };
    });
  };

  showParameterSettings = (parameter, index) => {
    const { onParametersEdit } = this.props;
    EditParameterSettingsDialog.showModal({ parameter }).onClose(updated => {
      this.setState(({ parameters }) => {
        const updatedParameter = extend(parameter, updated);
        parameters[index] = createParameter(updatedParameter, updatedParameter.parentQueryId);
        onParametersEdit(parameters);
        return { parameters };
      });
    });
  };

  renderParameter(param, index) {
    const { editable } = this.props;
    if (param.hidden) {
      // 如果该参数被隐藏，则不进行渲染
      return null;
    }
    return (
      <div key={param.name} className="di-block" data-test={`ParameterName-${param.name}`}>
        <div className="parameter-heading">
          <label>{param.title || toHuman(param.name)}</label>
          {editable && (
            <PlainButton
              className="btn btn-default btn-xs m-l-5"
              aria-label="Edit"
              onClick={() => this.showParameterSettings(param, index)}
              data-test={`ParameterSettings-${param.name}`}
              type="button">
              <i className="fa fa-cog" aria-hidden="true" />
            </PlainButton>
          )}
        </div>

        <ParameterValueInput
          type={param.type}
          value={param.normalizedValue}
          parameter={param}
          enumOptions={param.enumOptions}
          queryId={param.queryId}
          onSelect={(value, isDirty) => this.setPendingValue(param, value, isDirty)}
        />
      </div>
    );
  }

  render() {
    const { sortable, appendSortableToParent } = this.props;
    const dirtyParamCount = size(filter(this.parameters, "hasPendingValue"));

    return (
      <SortableContainer
        disabled={!sortable}
        axis="xy"
        useDragHandle
        lockToContainerEdges
        helperClass="parameter-dragged"
        helperContainer={containerEl =>
          appendSortableToParent ? containerEl : document.body}
        updateBeforeSortStart={this.onBeforeSortStart}
        onSortEnd={this.moveParameter}
        containerProps={{
          className: "parameter-container",
          onKeyDown: dirtyParamCount ? this.handleKeyDown : null,
        }}>
        {this.parameters.map((param, index) => (
          <SortableElement key={param.name} index={index}>
            <div
              className="parameter-block"
              data-editable={sortable || null}
              data-test={`ParameterBlock-${param.name}`}>
              {sortable && <DragHandle data-test={`DragHandle-${param.name}`} />}
              {this.renderParameter(param, index)}
            </div>
          </SortableElement>
        ))}
        <ParameterApplyButton onClick={this.applyChanges} paramCount={dirtyParamCount} />
      </SortableContainer>
    );
  }
}
